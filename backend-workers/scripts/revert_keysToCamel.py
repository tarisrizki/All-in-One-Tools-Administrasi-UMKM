import os
import re

directory = 'src/modules'

def snake_case(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

for filename in os.listdir(directory):
    if filename.endswith('.ts'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove import
        content = re.sub(r"import\s+\{\s*keysToCamel\s*\}\s*from\s*'../utils/caseConverter';\s*\n*", '', content)
        
        # Replace keysToCamel(...)
        # Pattern 1: keysToCamel(data || [])
        content = content.replace('keysToCamel(data || [])', 'data || []')
        # Pattern 2: keysToCamel(data[0])
        content = content.replace('keysToCamel(data[0])', 'data[0]')
        # Pattern 3: keysToCamel(data)
        content = content.replace('keysToCamel(data)', 'data')
        # Pattern 4: keysToCamel(result)
        content = content.replace('keysToCamel(result)', 'result')
        # Pattern 5: keysToCamel(formattedData)
        content = content.replace('keysToCamel(formattedData)', 'formattedData')
        content = content.replace('keysToCamel(formattedRows)', 'formattedRows')
        content = content.replace('keysToCamel(formattedPo)', 'formattedPo')
        content = content.replace('keysToCamel(newRole)', 'newRole')
        content = content.replace('keysToCamel(updatedRole)', 'updatedRole')
        content = content.replace('keysToCamel(updatedDebt)', 'updatedDebt')
        content = content.replace('keysToCamel(updatedPo)', 'updatedPo')
        content = content.replace('keysToCamel(po)', 'po')
        content = content.replace('keysToCamel(saleData)', 'saleData')
        
        # Complex ones: keysToCamel({ ... })
        content = re.sub(r'keysToCamel\(\{\s*(.*?)\s*\}\)', r'{ \1 }', content, flags=re.DOTALL)
        
        # Replace camelCase in Response schemas
        # We need to find block like z.object({ ... }) and for lines with xxx: z., we convert xxx to snake_case
        def replacer(match):
            block = match.group(0)
            lines = block.split('\n')
            new_lines = []
            for line in lines:
                m = re.match(r'(\s*)([a-zA-Z0-9_]+)(\s*:\s*z\.)', line)
                if m:
                    indent = m.group(1)
                    key = m.group(2)
                    rest = line[len(m.group(1)) + len(m.group(2)):]
                    new_key = snake_case(key)
                    new_lines.append(indent + new_key + rest)
                else:
                    new_lines.append(line)
            return '\n'.join(new_lines)
            
        content = re.sub(r'ResponseSchema\s*=\s*z\.object\(\{.*?\}\)(?:\.passthrough\(\))?', replacer, content, flags=re.DOTALL)
        content = re.sub(r'createSuccessSchema\(z\.object\(\{.*?\}\)(?:\.passthrough\(\))?\)', replacer, content, flags=re.DOTALL)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
