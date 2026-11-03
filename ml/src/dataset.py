from pathlib import Path
import pandas as pd
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

IMAGE_SIZE = 224

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

DEFAULT_TRAIN_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=10),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

DEFAULT_EVAL_TRANSFORM = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

class CoffeeLeafDataset(Dataset): #Carga imágenes de café según las asignaciones del manifiesto.
    def __init__(
        self,
        manifest_path,
        split,
        transform=None,
    ):
        self.manifest_path = Path(manifest_path)
        self.manifest = pd.read_csv(self.manifest_path)

        if split not in {"train", "val", "test"}:
            raise ValueError(
                "split debe ser 'train', 'val' o 'test'."
            )

        required_columns = {"ruta", "clase", "sha256", "split"}
        missing_columns = required_columns - set(self.manifest.columns)

        if missing_columns:
            raise ValueError(
                f"Faltan columnas en el manifiesto: {missing_columns}"
            )

        self.data = (
            self.manifest[self.manifest["split"] == split]
            .reset_index(drop=True)
        )

        self.transform = transform

        self.class_to_idx = {
            "Roya": 0,
            "Sanas": 1,
        }

        unknown_classes = set(self.data["clase"]) - set(
            self.class_to_idx
        )

        if unknown_classes:
            raise ValueError(
                f"Clases no reconocidas: {unknown_classes}"
            )

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        row = self.data.iloc[index]
        image_path = Path(row["ruta"])

        if not image_path.is_file():
            raise FileNotFoundError(
                f"No se encontró la imagen: {image_path}"
            )

        with Image.open(image_path) as image:
            image = image.convert("RGB")

        if self.transform is not None:
            image = self.transform(image)

        label = self.class_to_idx[row["clase"]]

        return image, label

def create_dataset(manifest_path, split): # Crea un dataset con transformaciones según el conjunto.
    if split == "train":
        transform = DEFAULT_TRAIN_TRANSFORM
    elif split in {"val", "test"}:
        transform = DEFAULT_EVAL_TRANSFORM
    else:
        raise ValueError(
            "split debe ser 'train', 'val' o 'test'."
        )

    return CoffeeLeafDataset(
        manifest_path=manifest_path,
        split=split,
        transform=transform,
    )