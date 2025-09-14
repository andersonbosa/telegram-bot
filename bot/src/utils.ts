
// 001 - curso docker -> cursor_docker_001
// 001 - aula de docker -> aula_de_docker_001
// 001 - Nome da aula 1.mp4 -> nome_da_aula_1.mp4
export function parseToTelegramHashtag(str: string): string {
    // Normalize accents
    let s = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Move leading digits (and optional spaces/dash/dot) to the end
    // e.g. "001 - curso docker" -> "curso docker 001"
    s = s.replace(/^(\d+)[\s\-\.]*/, '').trim() + ' ' + (str.match(/^(\d+)/)?.[1] ?? '')

    // Remove file extension if present (e.g. ".mp4")
    s = s.replace(/\.[a-zA-Z0-9]+$/, '')

    // Remove any non-alphanumeric (except space) and replace with underscore
    s = s.replace(/[^a-zA-Z0-9 ]+/g, '_')

    // Replace spaces with underscores, collapse multiple underscores, trim
    s = s.replace(/ +/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')

    // Lowercase
    return s.toLowerCase()
}
