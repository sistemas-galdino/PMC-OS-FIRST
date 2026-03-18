import fs from 'fs';
import { execSync } from 'child_process';

const icons = {
  Users: 'tabler:users',
  UserPlus: 'tabler:user-plus',
  TrendingUp: 'tabler:trending-up',
  Star: 'tabler:star',
  ChevronUp: 'tabler:chevron-up',
  ChevronDown: 'tabler:chevron-down',
  ShieldCheck: 'tabler:shield-check',
  Calendar: 'tabler:calendar',
  Search: 'tabler:search',
  Filter: 'tabler:filter',
  MessageSquare: 'tabler:message-circle',
  Check: 'tabler:check',
  ChevronRight: 'tabler:chevron-right',
  X: 'tabler:x',
  PanelLeft: 'tabler:layout-sidebar',
};

function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

let fileContent = `import React from 'react';\n\ntype IconProps = React.SVGProps<SVGSVGElement>;\n\n`;

for (const [name, id] of Object.entries(icons)) {
  console.log(`Fetching ${id}...`);
  try {
    const svgRaw = execSync(`npx better-icons get ${id}`).toString();
    
    // Process SVG to be React compatible
    let reactSvg = svgRaw
      .replace(/<svg /, '<svg {...props} ')
      .replace(/([a-z]+)-([a-z]+)=/gi, (match, p1, p2) => `${p1}${p2.charAt(0).toUpperCase() + p2.slice(1)}=`) // basic camel case for svg attrs
      .replace(/class=/g, 'className=')
      .replace(/xmlns:xlink=/g, 'xmlnsXlink=');

    fileContent += `export const ${name}Icon = (props: IconProps) => (\n  ${reactSvg.trim()}\n);\n\n`;
  } catch (err) {
    console.error(`Error fetching ${id}:`, err.message);
  }
}

fs.writeFileSync('web/src/components/ui/icons.tsx', fileContent);
console.log('Successfully generated web/src/components/ui/icons.tsx');
