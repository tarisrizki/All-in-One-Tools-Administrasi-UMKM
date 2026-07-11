import os
import re

modules_dir = 'src/modules'

def capitalize(name):
    if name == 'ai':
        return 'AI'
    elif name == 'auth':
        return 'Auth'
    elif name == 'cashbook':
        return 'Cashbook'
    return name.capitalize()

for filename in os.listdir(modules_dir):
    if not filename.endswith('.ts'):
        continue
    filepath = os.path.join(modules_dir, filename)
    module_name = filename[:-3]
    tag_name = capitalize(module_name)
    
    with open(filepath, 'r') as f:
        content = f.read()
        
    # Find all createRoute({
    # We want to insert `tags: ['TagName'],` inside the `createRoute({` if not already there.
    # A simple regex: replace `createRoute({` with `createRoute({\n  tags: ['TagName'],`
    
    if "createRoute({" in content and f"tags: ['{tag_name}']" not in content:
        content = content.replace("createRoute({", f"createRoute({{\n  tags: ['{tag_name}'],")
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Added tags to {filename}")

print("Done")
