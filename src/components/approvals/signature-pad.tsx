import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Eraser, Check, FileSignature, Type, Upload, PenTool, ShieldCheck } from 'lucide-react'

interface SignaturePadProps {
    onSave: (data: { signatureData: string; signatureType: 'drawn' | 'typed' | 'uploaded'; typedFont?: string; legalConsent: boolean }) => void
    onCancel?: () => void
    saving?: boolean
    defaultSignerName?: string
}

const SIGNATURE_FONTS = [
    { id: 'font-great-vibes', name: 'Great Vibes', font: 'Great Vibes, cursive' },
    { id: 'font-dancing', name: 'Dancing Script', font: 'Dancing Script, cursive' },
    { id: 'font-sacramento', name: 'Sacramento', font: 'Sacramento, cursive' },
    { id: 'font-caveat', name: 'Caveat', font: 'Caveat, cursive' }
]

const PEN_COLORS = [
    { name: 'Dark Slate', value: '#0f172a' },
    { name: 'Royal Blue', value: '#1d4ed8' },
    { name: 'Midnight Blue', value: '#1e3a8a' },
    { name: 'Emerald', value: '#047857' }
]

export function SignaturePad({ onSave, onCancel, saving, defaultSignerName = '' }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [mode, setMode] = useState<'drawn' | 'typed' | 'uploaded'>('drawn')
    
    // Draw state
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasStrokes, setHasStrokes] = useState(false)
    const [penColor, setPenColor] = useState('#0f172a')
    const [penWidth, setPenWidth] = useState(2.5)

    // Type state
    const [typedName, setTypedName] = useState(defaultSignerName)
    const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].font)

    // Upload state
    const [uploadedImage, setUploadedImage] = useState<string | null>(null)

    // Consent
    const [consentChecked, setConsentChecked] = useState(true)

    // Load fonts dynamically
    useEffect(() => {
        const link = document.createElement('link')
        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
    }, [])

    useEffect(() => {
        if (mode !== 'drawn') return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.strokeStyle = penColor
        ctx.lineWidth = penWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
    }, [penColor, penWidth, mode])

    const startDrawing = (e: any) => {
        setIsDrawing(true)
        setHasStrokes(true)
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        ctx.beginPath()
        ctx.moveTo(clientX - rect.left, clientY - rect.top)
    }

    const draw = (e: any) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        ctx.lineTo(clientX - rect.left, clientY - rect.top)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearSignature = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasStrokes(false)
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            setUploadedImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    // Convert typed signature text to canvas base64 image
    const generateTypedSignatureDataUrl = (): string => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = 500
        tempCanvas.height = 180
        const ctx = tempCanvas.getContext('2d')
        if (!ctx) return ''

        // Clean background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

        ctx.fillStyle = penColor
        ctx.font = `52px ${selectedFont}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName || 'Signer Name', tempCanvas.width / 2, tempCanvas.height / 2)

        return tempCanvas.toDataURL('image/png')
    }

    const handleSave = () => {
        if (!consentChecked) return

        let finalDataUrl = ''
        if (mode === 'drawn') {
            const canvas = canvasRef.current
            if (!canvas || !hasStrokes) return
            finalDataUrl = canvas.toDataURL('image/png')
        } else if (mode === 'typed') {
            if (!typedName.trim()) return
            finalDataUrl = generateTypedSignatureDataUrl()
        } else if (mode === 'uploaded') {
            if (!uploadedImage) return
            finalDataUrl = uploadedImage
        }

        onSave({
            signatureData: finalDataUrl,
            signatureType: mode,
            typedFont: mode === 'typed' ? selectedFont : undefined,
            legalConsent: true
        })
    }

    const isSaveDisabled =
        !consentChecked ||
        saving ||
        (mode === 'drawn' && !hasStrokes) ||
        (mode === 'typed' && !typedName.trim()) ||
        (mode === 'uploaded' && !uploadedImage)

    return (
        <Card className="border border-border/80 shadow-xl rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
                <Tabs value={mode} onValueChange={(val: any) => setMode(val)} className="w-full">
                    <TabsList className="grid grid-cols-3 rounded-xl p-1 bg-muted/60 mb-4">
                        <TabsTrigger value="drawn" className="rounded-lg text-xs font-bold gap-1.5">
                            <PenTool className="h-3.5 w-3.5" /> Draw
                        </TabsTrigger>
                        <TabsTrigger value="typed" className="rounded-lg text-xs font-bold gap-1.5">
                            <Type className="h-3.5 w-3.5" /> Type Name
                        </TabsTrigger>
                        <TabsTrigger value="uploaded" className="rounded-lg text-xs font-bold gap-1.5">
                            <Upload className="h-3.5 w-3.5" /> Upload Image
                        </TabsTrigger>
                    </TabsList>

                    {/* DRAW MODE */}
                    <TabsContent value="drawn" className="space-y-3 mt-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase">Pen Color:</span>
                                <div className="flex items-center gap-1.5">
                                    {PEN_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setPenColor(c.value)}
                                            className={`w-5 h-5 rounded-full border-2 transition-transform ${penColor === c.value ? 'scale-125 border-primary shadow-sm' : 'border-transparent opacity-80'}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Button variant="ghost" size="sm" onClick={clearSignature} disabled={!hasStrokes} className="text-xs text-muted-foreground h-7 rounded-lg">
                                <Eraser className="h-3.5 w-3.5 mr-1" /> Clear Pad
                            </Button>
                        </div>

                        <div className="border-2 border-dashed border-primary/20 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 relative overflow-hidden touch-none">
                            <canvas
                                ref={canvasRef}
                                width={480}
                                height={170}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-[170px] cursor-crosshair"
                            />
                            {!hasStrokes && (
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-xs text-muted-foreground/50 font-medium">
                                    <FileSignature className="w-6 h-6 mb-1 opacity-40" />
                                    Draw your official signature here...
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* TYPE MODE */}
                    <TabsContent value="typed" className="space-y-4 mt-0">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Type Full Name / Signature</Label>
                            <Input
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                placeholder="Enter your full legal name..."
                                className="rounded-xl font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Select Cursive Typography Style</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {SIGNATURE_FONTS.map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setSelectedFont(f.font)}
                                        className={`p-3 rounded-xl border text-left transition-all ${selectedFont === f.font ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:bg-muted/40'}`}
                                    >
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase">{f.name}</div>
                                        <div className="text-xl pt-1 truncate" style={{ fontFamily: f.font, color: penColor }}>
                                            {typedName || 'Signature Preview'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* UPLOAD MODE */}
                    <TabsContent value="uploaded" className="space-y-3 mt-0">
                        <div className="border-2 border-dashed border-primary/20 rounded-xl p-6 text-center bg-slate-50/60 dark:bg-slate-900/60 flex flex-col items-center justify-center space-y-2">
                            {uploadedImage ? (
                                <div className="space-y-3 w-full flex flex-col items-center">
                                    <img src={uploadedImage} alt="Uploaded Signature" className="max-h-28 object-contain p-2 bg-white rounded-lg border shadow-sm" />
                                    <Button variant="outline" size="sm" onClick={() => setUploadedImage(null)} className="h-7 text-xs rounded-lg">
                                        Remove & Upload Different File
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-primary/60 mb-1" />
                                    <p className="text-xs font-semibold text-foreground">Upload Scanned Signature (PNG/JPG)</p>
                                    <p className="text-[11px] text-muted-foreground">High resolution image with white/transparent background recommended.</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        id="signature-upload-input"
                                    />
                                    <label htmlFor="signature-upload-input">
                                        <Button type="button" variant="secondary" size="sm" className="mt-2 rounded-xl font-bold cursor-pointer" onClick={() => document.getElementById('signature-upload-input')?.click()}>
                                            Browse File
                                        </Button>
                                    </label>
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Legal Consent Checkbox */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <Checkbox
                        id="legal-consent"
                        checked={consentChecked}
                        onCheckedChange={(val: boolean) => setConsentChecked(val)}
                        className="mt-0.5"
                    />
                    <label htmlFor="legal-consent" className="text-[11px] text-muted-foreground leading-snug cursor-pointer">
                        <span className="font-semibold text-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /> Binding Electronic Signature Notice
                        </span>
                        I confirm that this electronic signature is intended to be a legally binding representation of my signature and intent to approve.
                    </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1">
                    {onCancel && (
                        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="rounded-xl">
                            Cancel
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaveDisabled}
                        className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg"
                    >
                        <Check className="h-4 w-4 mr-1.5" />
                        {saving ? 'Submitting Signature...' : 'Confirm Signature & Approve'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
