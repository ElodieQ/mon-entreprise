import { coerceArray } from '../utils'
import { CacheMeta } from './traverse'

// TODO: Add english translations for error messages

export function genericError(typeOfError: string, message: string) {
	throw new Error(`\n[ ${typeOfError} ]\n✖️ ${message}`)
}

export function syntaxError(
	rules: string[] | string,
	message: string,
	originalError: Error
) {
	throw new Error(
		`\n[ Erreur syntaxique ]
➡️ Dans la règle \`${coerceArray(rules).slice(-1)[0]}\`
✖️ ${message}
  ${originalError?.message}
`
	)
}

export function evaluationError(
	cacheMeta: CacheMeta,
	message: string,
	originalError?: Error
) {
	throw new Error(
		`\n[ Erreur d'évaluation ]
➡️ Dans la règle \`${coerceArray(cacheMeta.contextRule).slice(-1)[0]}\`
✖️ ${message}
  ${originalError?.message}
`
	)
}

export function typeWarning(
	cacheMeta: CacheMeta,
	message: string,
	originalError?: Error
) {
	cacheMeta.warnings.push(
		`\n[ Erreur de type ]
➡️ Dans la règle \`${coerceArray(cacheMeta.contextRule).slice(-1)[0]}\`
✖️ ${message}
  ${originalError?.message}
`
	)
}

export function warning(
	rules: string[] | string,
	message: string,
	solution: string
) {
	console.warn(
		`\n[ Avertissement ]
➡️ Dans la règle \`${coerceArray(rules).slice(-1)[0]}\`
⚠️ ${message}
💡 ${solution}
`
	)
}
