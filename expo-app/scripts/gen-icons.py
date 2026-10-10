#!/usr/bin/env python3
"""Regenerate src/ui/iconPaths.ts from phosphor-react-native (devDependency).

Usage (from expo-app/):  python3 scripts/gen-icons.py
Add an icon: map a semantic name to a Phosphor icon in NAMES, re-run, then
add the name to IconName usages. Icons: https://phosphoricons.com (MIT).
"""
import json, re

SRC = 'node_modules/phosphor-react-native/src/defs/'
NAMES = {
    'home': 'House', 'expenses': 'Receipt', 'analytics': 'ChartPieSlice', 'goals': 'Target',
    'settings': 'GearSix', 'plan': 'Calculator', 'add': 'Plus', 'remove': 'Minus',
    'edit': 'PencilSimple', 'delete': 'Trash', 'close': 'X', 'check': 'Check',
    'forward': 'CaretRight', 'back': 'CaretLeft', 'success': 'CheckCircle', 'warning': 'Warning',
    'error': 'WarningCircle', 'info': 'Info', 'tip': 'Lightbulb', 'smart': 'Sparkle',
    'question': 'Question', 'income': 'ArrowDownLeft', 'expense': 'ArrowUpRight', 'wallet': 'Wallet',
    'savings': 'PiggyBank', 'coins': 'Coins', 'currency': 'CurrencyCircleDollar',
    'handCoins': 'HandCoins', 'trendUp': 'TrendUp', 'trendDown': 'TrendDown', 'chartUp': 'ChartLineUp',
    'health': 'Gauge', 'trophy': 'Trophy', 'shield': 'ShieldCheck', 'calendar': 'CalendarBlank', 'eye': 'Eye', 'eyeOff': 'EyeSlash', 'repeat': 'Repeat', 'fingerprint': 'Fingerprint', 'quick': 'Lightning', 'backspace': 'Backspace', 'search': 'MagnifyingGlass', 'clear': 'XCircle',
    'lock': 'Lock', 'language': 'Translate', 'sun': 'Sun', 'moon': 'Moon', 'radioOn': 'RadioButton',
    'radioOff': 'Circle', 'catHousing': 'House', 'catFood': 'ForkKnife', 'catTransport': 'Car',
    'catUtilities': 'Lightning', 'catTelecom': 'DeviceMobile', 'catHealth': 'Heartbeat',
    'catEducation': 'GraduationCap', 'catFamily': 'UsersThree', 'catShopping': 'ShoppingBag',
    'catEntertainment': 'Popcorn', 'catDebt': 'CreditCard', 'catOther': 'Shapes',
    'target': 'Target', 'hourglass': 'Hourglass', 'scales': 'Scales', 'sparkle': 'Sparkle', 'flag': 'Flag', 'book': 'BookOpenText',
}


def section(txt, weight):
    i = txt.index(f"'{weight}',")
    j = txt.find("\n  [\n    '", i + 5)
    return txt[i: j if j > 0 else len(txt)]


out = {}
for key, ph in NAMES.items():
    t = open(SRC + ph + '.tsx').read()
    regular = re.findall(r'<Path\s+d="([^"]+)"', section(t, 'regular'))
    paths = re.findall(r'<Path\s+d="([^"]+)"(\s+opacity=\{duotoneOpacity\})?', section(t, 'duotone'))
    out[key] = {'r': regular, 'f': [d for d, o in paths if o], 'l': [d for d, o in paths if not o]}
    assert out[key]['r'] and out[key]['l'], key

lines = [
    '/* GENERATED from Phosphor Icons (https://phosphoricons.com) — MIT License,',
    ' * Copyright (c) 2023 Phosphor Icons. Regenerate with scripts/gen-icons.py.',
    ' * viewBox 0 0 256 256. r = regular weight; f = duotone fill layer; l = duotone line layer. */',
    'export const ICON_PATHS = {',
]
lines += [f'  {k}: {json.dumps(v, separators=(",", ":"))},' for k, v in out.items()]
lines.append('} satisfies Record<string, { r: string[]; f: string[]; l: string[] }>;')
open('src/ui/iconPaths.ts', 'w').write('\n'.join(lines) + '\n')
print(f'{len(out)} icons written')
