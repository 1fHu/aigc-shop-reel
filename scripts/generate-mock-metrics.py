"""
Generate mock analytics metrics for demo videos.
Usage: python generate-mock-metrics.py [video_id]
"""
import sys
import json
import random


def main(video_id: str):
    metrics = {
        "video_id": video_id,
        "views": random.randint(1000, 50000),
        "completion_rate": round(random.uniform(0.15, 0.65), 4),
        "click_rate": round(random.uniform(0.01, 0.08), 4),
        "conversion_rate": round(random.uniform(0.001, 0.02), 4),
        "gmv": round(random.uniform(500, 20000), 2),
    }
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    vid = sys.argv[1] if len(sys.argv) > 1 else "demo-video-id"
    main(vid)
