'use client'

import { useState } from 'react'
import { Upload, FileText, X, Link, Paperclip } from 'lucide-react'

interface Props {
  file:         File | null
  onFileSelect: (file: File | null) => void
  url:          string
  onUrlChange:  (url: string) => void
}

export function AssisteurCoverageUploader({ file, onFileSelect, url, onUrlChange }: Props) {
  const [mode, setMode] = useState<'file' | 'url'>('file')

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Toggle */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === 'file'
              ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          Fichier
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === 'url'
              ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-500'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Link className="w-3.5 h-3.5" />
          Lien
        </button>
      </div>

      {/* Contenu */}
      <div className="p-3 bg-slate-50">
        {mode === 'file' ? (
          <>
            {file ? (
              <div className="flex items-center justify-between gap-3 p-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-orange-700 truncate">{file.name}</p>
                    <p className="text-xs text-orange-500">{Math.round(file.size / 1024)} Ko</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFileSelect(null)}
                  className="shrink-0 p-1 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.heic"
                  className="sr-only"
                  onChange={e => onFileSelect(e.target.files?.[0] ?? null)}
                />
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 group-hover:border-brand-400 group-hover:text-brand-600 transition-colors">
                  <Upload className="w-4 h-4" />
                  Sélectionner un fichier PDF ou image
                </div>
              </label>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="url"
                value={url}
                onChange={e => onUrlChange(e.target.value)}
                placeholder="https://drive.google.com/…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => onUrlChange('')}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {url && (
              <p className="text-xs text-brand-600 flex items-center gap-1 pl-1">
                <Link className="w-3 h-3" />
                Lien prêt à être joint au dossier
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-2">
          Document de prise en charge — optionnel, visible par le loueur.
        </p>
      </div>
    </div>
  )
}
