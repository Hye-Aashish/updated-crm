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

let changed = 0
for (const file of files) {
    let src = fs.readFileSync(file, 'utf8')
    if (!src.includes('await appConfirm') && !src.includes('await appAlert')) continue
    const original = src

    // onClick={() => await ...}  -> onClick={async () => ...}
    src = src.replace(
        /(on(?:Click|Change|Submit|KeyDown|Select)\s*=\s*\{)\s*\(\s*([^)]*)\s*\)\s*=>\s*await\s+/g,
        '$1async ($2) => '
    )
    // onClick={() => { ... await ...}} without async
    src = src.replace(
        /(on(?:Click|Change|Submit|KeyDown|Select)\s*=\s*\{)\s*\(\s*([^)]*)\s*\)\s*=>\s*\{/g,
        (match, prefix, args, offset) => {
            // look ahead ~800 chars for await app without async already
            const ahead = src.slice(offset, offset + 900)
            if (/await app(Confirm|Alert)/.test(ahead) && !/^on\w+\s*=\s*\{\s*async/.test(match)) {
                return `${prefix}async (${args}) => {`
            }
            return match
        }
    )

    // const foo = (...) => { ... await app... }  -> async
    src = src.replace(
        /(const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g,
        (match, kind, name, args, offset) => {
            if (match.includes('async')) return match
            // find matching body roughly until next top-level const/function or 80 lines
            const rest = src.slice(offset)
            const bodyMatch = rest.match(/^[^{]*\{([\s\S]*?)\n(?:\s{0,4}(?:const|let|function|return\s*\(|\/\/\s*—|\s*return\s*\())/)
            // simpler: take next 2500 chars as body window
            const window = src.slice(offset, offset + 2500)
            if (/await app(Confirm|Alert)/.test(window)) {
                // ensure the await belongs to this function: stop at next const/let/function at same indent
                return `${kind} ${name} = async (${args}) => {`
            }
            return match
        }
    )

    // async function declarations already fine
    // function foo() { with await -> async function
    src = src.replace(
        /(?<!async\s)function\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
        (match, name, args, offset) => {
            const window = src.slice(offset, offset + 2500)
            if (/await app(Confirm|Alert)/.test(window)) {
                return `async function ${name}(${args}) {`
            }
            return match
        }
    )

    // methods: const handleX = async already handled
    // handleX = () => without const - rare

    // Fix: return await appAlert(...) in non-async - already converted if parent got async
    // onClick with void: onClick={() => void appAlert} cases

    // Specific broken pattern: onClick={() => await appAlert
    src = src.replace(
        /onClick=\{\(\)\s*=>\s*await\s+appAlert/g,
        'onClick={async () => appAlert'
    )
    src = src.replace(
        /onClick=\{\(\)\s*=>\s*await\s+appConfirm/g,
        'onClick={async () => appConfirm'
    )

    if (src !== original) {
        fs.writeFileSync(file, src)
        changed++
        console.log('fixed', file)
    }
}
console.log('files fixed:', changed)
