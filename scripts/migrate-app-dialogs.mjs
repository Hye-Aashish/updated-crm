import fs from 'fs'
import path from 'path'

const files = []
function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name)
        if (ent.isDirectory()) walk(p)
        else if (/\.(tsx|ts)$/.test(ent.name)) files.push(p)
    }
}
walk('src')

const skip = new Set([
    path.normalize('src/lib/app-dialog.ts'),
    path.normalize('src/components/confirm-provider.tsx'),
    path.normalize('src/components/pwa-install-banner.tsx'),
])

let changed = 0
for (const file of files) {
    if (skip.has(path.normalize(file))) continue
    let src = fs.readFileSync(file, 'utf8')
    const original = src

    const hasConfirm = /window\.confirm\s*\(|(?<![\w.])confirm\s*\(/.test(src)
    const hasAlert = /window\.alert\s*\(|(?<![\w.])alert\s*\(/.test(src)
    if (!hasConfirm && !hasAlert) continue

    src = src.replace(/window\.confirm\s*\(/g, 'await appConfirm(')
    src = src.replace(/window\.alert\s*\(/g, 'await appAlert(')
    src = src.replace(/(?<![\w.])confirm\s*\(/g, 'await appConfirm(')
    src = src.replace(/(?<![\w.])alert\s*\(/g, 'await appAlert(')
    src = src.replace(/await\s+await\s+appConfirm\(/g, 'await appConfirm(')
    src = src.replace(/await\s+await\s+appAlert\(/g, 'await appAlert(')

    if (src === original) continue

    const usesConfirm = src.includes('appConfirm')
    const usesAlert = src.includes('appAlert')
    const names = [usesConfirm && 'appConfirm', usesAlert && 'appAlert'].filter(Boolean).join(', ')

    if (!/from\s+['"]@\/lib\/app-dialog['"]/.test(src)) {
        const line = `import { ${names} } from '@/lib/app-dialog'\n`
        const importMatches = [...src.matchAll(/^import .+;?\s*$/gm)]
        if (importMatches.length) {
            const last = importMatches[importMatches.length - 1]
            const idx = last.index + last[0].length
            src = src.slice(0, idx) + '\n' + line + src.slice(idx)
        } else {
            src = line + src
        }
    } else {
        src = src.replace(/import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/app-dialog['"]/, (_m, inner) => {
            const set = new Set(
                inner
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
            )
            if (usesConfirm) set.add('appConfirm')
            if (usesAlert) set.add('appAlert')
            return `import { ${[...set].join(', ')} } from '@/lib/app-dialog'`
        })
    }

    fs.writeFileSync(file, src)
    changed++
    console.log('updated', file)
}

console.log('files changed:', changed)
