import pandas as pd
import os


def read_file(filepath):

    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".csv":
        return pd.read_csv(filepath)

    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(filepath)

    elif ext == ".json":
        return pd.read_json(filepath)

    else:
        raise Exception(
            f"Unsupported file type: {ext}"
        )