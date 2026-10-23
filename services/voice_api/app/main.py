from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from threading import Lock
from typing import Any

import httpx
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


APP_VERSION = "0.1.0"
VOICE_THRESHOLD = float(os.getenv("VOICE_THRESHOLD", "0.70"))
VOICE_MARGIN = float(os.getenv("VOICE_MARGIN", "0.08"))
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(15 * 1024 * 1024)))
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_WEB_SEARCH = os.getenv("GROQ_WEB_SEARCH", "true").lower() == "true"

app = FastAPI(title="TruthMeter Voice API", version=APP_VERSION)

origins = [item.strip() for item in os.getenv("ALLOWED_ORIGINS", "*").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"]
)

_encoder: Any = None
_profiles: dict[str, np.ndarray] | None = None
_model_lock = Lock()


def _load_profiles() -> dict[str, np.ndarray]:
    raw = os.getenv("VOICEPRINTS_JSON", "").strip()
    if not raw:
        return {}

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("VOICEPRINTS_JSON não contém JSON válido") from exc

    if not isinstance(parsed, dict):
        raise RuntimeError("VOICEPRINTS_JSON deve ser um objeto com os nomes dos participantes")

    profiles: dict[str, np.ndarray] = {}
    for name, value in parsed.items():
        embedding = value.get("embedding") if isinstance(value, dict) else value
        array = np.asarray(embedding, dtype=np.float32)
        if array.ndim != 1 or array.size == 0 or not np.all(np.isfinite(array)):
            raise RuntimeError(f"Embedding inválido para o perfil {name}")
        norm = np.linalg.norm(array)
        if norm == 0:
            raise RuntimeError(f"Embedding vazio para o perfil {name}")
        profiles[str(name)] = array / norm
    return profiles


def _get_models() -> tuple[Any, dict[str, np.ndarray]]:
    global _encoder, _profiles
    with _model_lock:
        if _profiles is None:
            _profiles = _load_profiles()
        if _encoder is None:
            from resemblyzer import VoiceEncoder
            _encoder = VoiceEncoder("cpu")
    return _encoder, _profiles


def _cosine(left: np.ndarray, right: np.ndarray) -> float:
    denominator = float(np.linalg.norm(left) * np.linalg.norm(right))
    return float(np.dot(left, right) / denominator) if denominator else -1.0


def _parse_json_response(content: str) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("A resposta da Groq não é um objeto JSON")
    return parsed


async def _analyze_with_groq(caption: str) -> dict[str, Any]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY não configurada")

    system = (
        "Você é o verificador do TruthMeter. Analise uma legenda de debate político. "
        "Extraia uma única afirmação verificável. Não invente fatos, fontes ou números. "
        "Quando não houver evidência suficiente, use INDETERMINADA e score null. "
        "Responda SOMENTE JSON válido com as chaves: claim, classification, score, "
        "reason, evidence, sources, confidence. classification deve ser CORRETA, FALSA, "
        "PARCIAL ou INDETERMINADA. score deve ser inteiro de 0 a 100 ou null. "
        "sources deve ser uma lista de URLs realmente consultadas."
    )
    payload: dict[str, Any] = {
        "model": GROQ_MODEL,
        "temperature": 0.1,
        "max_completion_tokens": 700,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Legenda capturada agora:\n{caption}"},
        ],
    }
    if GROQ_WEB_SEARCH:
        payload["tools"] = [{"type": "browser_search"}]
        payload["tool_choice"] = "auto"

    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Groq retornou HTTP {response.status_code}")

    body = response.json()
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        result = _parse_json_response(content)
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=502, detail="Groq retornou uma resposta fora do formato esperado") from exc

    allowed = {"CORRETA", "FALSA", "PARCIAL", "INDETERMINADA"}
    classification = result.get("classification", "INDETERMINADA")
    if classification not in allowed:
        classification = "INDETERMINADA"
    score = result.get("score")
    if not isinstance(score, int) or not 0 <= score <= 100:
        score = None
    sources = result.get("sources") if isinstance(result.get("sources"), list) else []
    return {
        "claim": str(result.get("claim") or caption),
        "classification": classification,
        "score": score if classification != "INDETERMINADA" else None,
        "reason": str(result.get("reason") or "Sem justificativa suficiente."),
        "evidence": str(result.get("evidence") or "Nenhuma evidência suficiente retornada."),
        "sources": [str(source) for source in sources[:5]],
        "confidence": str(result.get("confidence") or "Baixa"),
        "model": GROQ_MODEL,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    profiles_configured = bool(os.getenv("VOICEPRINTS_JSON", "").strip())
    return {
        "status": "ok",
        "version": APP_VERSION,
        "profiles_configured": profiles_configured,
        "profiles_loaded": len(_profiles or {}),
        "threshold": VOICE_THRESHOLD,
        "margin": VOICE_MARGIN,
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "groq_model": GROQ_MODEL,
    }


@app.post("/v1/identify")
async def identify(audio: UploadFile = File(...)) -> dict[str, Any]:
    if not audio.content_type or not (
        audio.content_type.startswith("audio/")
        or audio.content_type == "application/octet-stream"
    ):
        raise HTTPException(status_code=415, detail="Envie um arquivo de áudio")

    payload = await audio.read(MAX_AUDIO_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="O arquivo de áudio está vazio")
    if len(payload) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo de áudio excede o limite permitido")

    try:
        encoder, profiles = _get_models()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Perfis vocais indisponíveis: {exc}") from exc

    if len(profiles) < 2:
        raise HTTPException(status_code=503, detail="Configure pelo menos dois perfis em VOICEPRINTS_JSON")

    suffix = Path(audio.filename or "audio.bin").suffix or ".bin"
    temp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            handle.write(payload)
            temp_path = handle.name

        from resemblyzer import preprocess_wav
        waveform = preprocess_wav(temp_path)
        if waveform.size == 0:
            raise HTTPException(status_code=422, detail="Não foi possível encontrar fala no áudio")
        embedding = encoder.embed_utterance(waveform)
        embedding = embedding / np.linalg.norm(embedding)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Não foi possível processar o áudio: {exc}") from exc
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    scores = {name: _cosine(embedding, profile) for name, profile in profiles.items()}
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    winner, winner_score = ordered[0]
    second_score = ordered[1][1] if len(ordered) > 1 else -1.0
    observed_margin = winner_score - second_score
    accepted = winner_score >= VOICE_THRESHOLD and observed_margin >= VOICE_MARGIN

    return {
        "classification": winner if accepted else "unknown",
        "scores": {name: round(score, 4) for name, score in scores.items()},
        "winner_score": round(winner_score, 4),
        "margin": round(observed_margin, 4),
        "threshold": VOICE_THRESHOLD,
        "required_margin": VOICE_MARGIN,
        "indeterminate": not accepted,
    }


@app.post("/v1/analyze-caption")
async def analyze_caption(payload: dict[str, Any]) -> dict[str, Any]:
    caption = str(payload.get("caption", "")).strip()
    if len(caption) < 8:
        raise HTTPException(status_code=400, detail="Legenda muito curta para análise")
    if len(caption) > 1200:
        caption = caption[:1200]
    return await _analyze_with_groq(caption)
