/* @flow */
import { isNil } from 'ramda'
import type { SaveExistingCompanyDetailsAction } from 'Types/companyTypes'
import type { LegalStatus } from 'Selectors/companyStatusSelectors'

const getCommuneByCodeInsee = function(codeInsee: string) {
	return fetch(
		`https://geo.api.gouv.fr/communes/${codeInsee}?fields=departement,region`
	).then(response => {
		return response.json()
	})
}
const getCommuneByCodePostal = function(codePostal: string) {
	return fetch(
		`https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=departement,region`
	)
		.then(response => {
			return response.json()
		})
		.then(communes => {
			if (!communes || communes.length === 0) {
				throw new Error(
					`Pas de commune associée à ce code postal : ${codePostal}`
				)
			}
			if (communes.length > 1) {
				throw new Error(
					`Trop de communes associées à ce code postal : ${codePostal}`
				)
			}
			return communes[0]
		})
}

const getLegalStatus = (
	{ nature_juridique_entreprise: codeNatureJuridique },
	isAutoEntrepreneur
): ?LegalStatus => {
	/*
	Nous utilisons le code entreprise pour connaitre le statut juridique
	(voir https://www.insee.fr/fr/information/2028129)

	En revanche, impossible de différencier EI et auto-entreprise
	https://www.sirene.fr/sirene/public/question.action?idQuestion=2933
	*/
	if (!codeNatureJuridique) {
		return isAutoEntrepreneur ? 'auto-entrepreneur' : 'EI'
	}
	if (codeNatureJuridique === '5498') {
		return 'EURL'
	}
	if (codeNatureJuridique.match(/^54..$/)) {
		return 'SARL'
	}
	if (codeNatureJuridique.match(/^55..$/)) {
		return 'SA'
	}
	if (codeNatureJuridique === '5720') {
		return 'SASU'
	}
	if (codeNatureJuridique.match(/^57..$/)) {
		return 'SAS'
	}
	return null
}

export const saveExistingCompanyDetails = (
	details: { [string]: string },
	isAutoEntrepreneur?: boolean
) => (
	dispatch: SaveExistingCompanyDetailsAction => void,
	_: any,
	{ history, sitePaths }: any
) => {
	let effectif = Number.parseInt(
		details.tranche_effectif_salarie_entreprise_centaine_pret,
		10
	)
	effectif = isNaN(effectif) ? null : effectif
	const legalStatus = getLegalStatus(details, isAutoEntrepreneur)

	dispatch({
		type: 'SAVE_EXISTING_COMPANY_DETAILS',
		details: {
			siret: details.siret,
			...(!isNil(effectif) ? { effectif } : null),
			...(legalStatus ? { legalStatus } : null),
			apiDetails: details
		}
	})
	history.push(sitePaths.sécuritéSociale.index)
	getCommuneByCodeInsee(details.departement + details.commune)
		.catch(err => {
			console.warn(err)
			return getCommuneByCodePostal(details.code_postal)
		})
		.catch(err => {
			console.warn(err)
			return null
		})
		.then(commune =>
			dispatch({
				type: 'SAVE_EXISTING_COMPANY_DETAILS',
				details: {
					siret: details.siret,
					...(!isNil(effectif) ? { effectif } : null),
					...(commune ? { localisation: commune } : null),
					...(legalStatus ? { legalStatus } : null),
					apiDetails: details
				}
			})
		)
}
