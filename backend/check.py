import torch
checkpoint = torch.load("best_convnext_food101_15.pth", map_location="cpu")

print("\n🔑 Ключи в checkpoint:")
for k in checkpoint.keys():
    print(" -", k)
