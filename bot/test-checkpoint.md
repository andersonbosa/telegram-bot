# Sistema de Checkpoint - Teste e Demonstração

## Como Testar o Sistema de Checkpoint

### 1. Primeira Execução (Upload Normal)
```bash
npm run cli upload-folder -1001234567890 /path/to/folder FullCycle --dry-run
```

### 2. Simular Falha (Interromper com Ctrl+C)
```bash
npm run cli upload-folder -1001234567890 /path/to/folder FullCycle
# Pressionar Ctrl+C após alguns arquivos serem processados
```

### 3. Retomar Upload
```bash
npm run cli upload-folder -1001234567890 /path/to/folder FullCycle
# Deve mostrar: "Resuming: X files already processed"
```

### 4. Restart Completo
```bash
rm checkpoint_*.json
npm run cli upload-folder -1001234567890 /path/to/folder FullCycle
# Deve começar do zero
```

## Estrutura do Arquivo de Checkpoint

O arquivo `checkpoint_{hash}.json` contém:

```json
{
  "sessionId": "1703123456789",
  "startTime": "2023-12-21T10:30:00.000Z",
  "lastUpdate": "2023-12-21T10:35:00.000Z",
  "params": {
    "groupId": "-1001234567890",
    "folderPath": "/path/to/folder",
    "referenceBasePath": "FullCycle",
    "dryRun": false
  },
  "stats": {
    "totalFiles": 50,
    "processedFiles": 15,
    "successfulUploads": 12,
    "failedUploads": 3
  },
  "completedFiles": [
    "video001.mp4",
    "video002.mp4",
    "subfolder/video003.mp4"
  ]
}
```

## Comportamentos Esperados

### ✅ Upload Bem-sucedido
- Checkpoint é criado no início
- Progresso salvo a cada 5 arquivos
- Checkpoint removido ao final
- Mensagem: "Upload completed successfully - checkpoint cleaned up"

### ⚠️ Upload com Falhas
- Checkpoint mantido
- Mensagem: "Progress saved. To retry failed uploads, run the same command again."
- Instrução: "To start fresh, delete: checkpoint_abc123.json"

### 🔄 Retomada de Upload
- Detecta checkpoint existente
- Mostra: "Resuming: X files already processed"
- Pula arquivos já processados
- Continua do ponto onde parou

### 🗑️ Restart Manual
- Usuário remove arquivo checkpoint_*.json
- Próxima execução começa do zero
- Nenhuma detecção de retomada
