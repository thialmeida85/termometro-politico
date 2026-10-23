#!/usr/bin/env python3
"""Classificador local de voz: Lula, Flávio ou desconhecido.

Uso:
  python3 voice_id.py audio.mp3 --profiles /home/ubuntu/truthmeter-private/private_voice_refs/voiceprints.json

Os limiares são provisórios e precisam de validação com amostras independentes.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
from resemblyzer import VoiceEncoder, preprocess_wav


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--profiles", default="/home/ubuntu/truthmeter-private/private_voice_refs/voiceprints.json")
    parser.add_argument("--threshold", type=float, default=0.70)
    parser.add_argument("--margin", type=float, default=0.08)
    args = parser.parse_args()

    profiles = json.loads(Path(args.profiles).read_text())
    encoder = VoiceEncoder("cpu")
    emb = encoder.embed_utterance(preprocess_wav(args.audio))
    scores = {name: cosine(emb, np.array(data["embedding"], dtype=np.float32)) for name, data in profiles.items()}
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    winner, winner_score = ordered[0]
    second_score = ordered[1][1] if len(ordered) > 1 else -1
    accepted = winner_score >= args.threshold and winner_score - second_score >= args.margin
    result = {
        "classification": winner if accepted else "unknown",
        "scores": {name: round(score, 4) for name, score in scores.items()},
        "threshold": args.threshold,
        "margin_required": args.margin,
        "margin_observed": round(winner_score - second_score, 4),
        "warning": "threshold provisório; validar com amostras independentes e vozes desconhecidas"
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
