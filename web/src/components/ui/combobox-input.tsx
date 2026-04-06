import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ComboboxInputProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  className?: string
}

export function ComboboxInput({ value, onChange, options, placeholder, className }: ComboboxInputProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  )

  const exactMatch = options.some(opt => opt.toLowerCase() === inputValue.trim().toLowerCase())

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        placeholder={placeholder}
        className={cn(
          "flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:border-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={(e) => {
          setInputValue(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (filtered.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl py-1">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer",
                opt === value && "bg-primary/5 text-primary font-semibold"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(opt)
                setInputValue(opt)
                setOpen(false)
              }}
            >
              {opt}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border-t border-border/50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(inputValue.trim())
                setOpen(false)
              }}
            >
              Criar "<span className="font-semibold text-foreground">{inputValue.trim()}</span>"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
