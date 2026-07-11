import os
import re

modules_dir = 'src/modules'
snake_regex = re.compile(r'\b[a-z]+_[a-z0-9_]+\s*:')

for filename in os.listdir(modules_dir):
    if not filename.endswith('.ts'):
        continue
    filepath = os.path.join(modules_dir, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all z.object(...) blocks
    z_objects = re.findall(r'z\.object\(\{([^}]+)\}\)', content)
    for block in z_objects:
        matches = snake_regex.findall(block)
        if matches:
            print(f"{filename}: {', '.join(matches)}")

