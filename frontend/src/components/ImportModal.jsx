import React, { useState, useRef } from 'react'
import { X, Upload, AlertTriangle } from 'lucide-react'
import api from '../services/api'

export default function ImportModal({ isOpen, onClose, onImportSuccess, title, endpoint }) {
  const [file, setFile] = useState(null)
  const [importMode, setImportMode] = useState('update')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    if (importMode === 'replace') {
      if (!confirm('¡ADVERTENCIA CRÍTICA!\n\nEstás a punto de vaciar todos los registros actuales. Esta acción no se puede deshacer y puede afectar otras partes del sistema.\n\n¿Estás absolutamente seguro de que deseas reemplazar todos los datos?')) {
        return
      }
    }

    setIsImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('import_mode', importMode)

    try {
      const res = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`Importación completada: ${res.data.created} registros creados${res.data.errors?.length ? `.\nErrores (${res.data.errors.length}): ${res.data.errors[0]}...` : ''}`)
      if (onImportSuccess) onImportSuccess()
      handleClose()
    } catch (err) {
      alert('Error al importar. Por favor revisa el archivo.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setImportMode('update')
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo Excel (.xlsx)</label>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleFileChange}
              ref={fileInputRef}
              required
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-palta-50 file:text-palta-700
                hover:file:bg-palta-100
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Modo de Importación</label>
            <div className="space-y-3">
              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${importMode === 'update' ? 'border-palta-500 bg-palta-50' : 'border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="importMode" 
                  value="update" 
                  checked={importMode === 'update'} 
                  onChange={() => setImportMode('update')}
                  className="mt-1 h-4 w-4 text-palta-600 focus:ring-palta-500 border-gray-300"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Actualizar Datos</span>
                  <span className="block text-sm text-gray-500">Agrega nuevos registros y actualiza los existentes sin borrar el historial.</span>
                </div>
              </label>

              <label className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${importMode === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="importMode" 
                  value="replace" 
                  checked={importMode === 'replace'} 
                  onChange={() => setImportMode('replace')}
                  className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-red-900 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Reemplazar Todo
                  </span>
                  <span className="block text-sm text-red-700 mt-1">Borra toda la tabla actual e importa únicamente los datos del archivo. ¡Cuidado!</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isImporting || !file}
              className="flex-1 px-4 py-2 bg-palta-600 text-white rounded-lg hover:bg-palta-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
