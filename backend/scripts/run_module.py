import runpy
import sys
from pathlib import Path


def add_package_dirs(primary_package_dir: str, project_root: str) -> None:
    root = Path(project_root)
    discovered = [Path(primary_package_dir), *sorted(root.glob(".packages*"))]
    seen: set[str] = set()
    for package_dir in discovered:
        resolved = str(package_dir)
        if resolved in seen or not package_dir.exists():
            continue
        seen.add(resolved)
        sys.path.insert(0, resolved)


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit("Usage: run_module.py <package_dir> <project_root> <module_name>")

    package_dir = sys.argv[1]
    project_root = sys.argv[2]
    module_name = sys.argv[3]

    add_package_dirs(package_dir, project_root)
    sys.path.insert(0, project_root)
    runpy.run_module(module_name, run_name="__main__")


if __name__ == "__main__":
    main()
