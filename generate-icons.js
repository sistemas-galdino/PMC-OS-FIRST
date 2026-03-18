import fs from 'fs';
import { execSync } from 'child_process';

const icons = {
  // Global & UI
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
  LayoutDashboard: 'tabler:layout-dashboard',
  Clock: 'tabler:clock',
  Settings: 'tabler:settings',
  LogOut: 'tabler:logout',
  Package: 'tabler:package',
  Megaphone: 'tabler:speakerphone',
  CheckSquare: 'tabler:checkbox',
  Compass: 'tabler:compass',

  // Feature Pages
  Square: 'tabler:square',
  CheckCircle2: 'tabler:circle-check',
  AlertCircle: 'tabler:alert-circle',
  Plus: 'tabler:plus',
  Trash2: 'tabler:trash',
  Edit3: 'tabler:edit',
  DollarSign: 'tabler:currency-dollar',
  Globe: 'tabler:world',
  Instagram: 'tabler:brand-instagram',
  Mail: 'tabler:mail',
  Linkedin: 'tabler:brand-linkedin',
  ArrowUpRight: 'tabler:arrow-up-right',
  Target: 'tabler:target',
  Circle: 'tabler:circle',
  ExternalLink: 'tabler:external-link',
  BookOpen: 'tabler:book',
  MessageCircle: 'tabler:message-circle',
  MoreHorizontal: 'tabler:dots',
  Phone: 'tabler:phone',
  MapPin: 'tabler:map-pin',
  Briefcase: 'tabler:briefcase',
  UserCheck: 'tabler:user-check',
  ShoppingCart: 'tabler:shopping-cart',
  Banknote: 'tabler:cash',
};

let fileContent = `import React from 'react';\n\ntype IconProps = React.SVGProps<SVGSVGElement>;\n\n`;

for (const [name, id] of Object.entries(icons)) {
  console.log(`Fetching ${id} for ${name}...`);
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
