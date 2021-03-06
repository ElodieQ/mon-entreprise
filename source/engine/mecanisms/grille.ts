import { defaultNode, evaluateNode, mergeAllMissing } from 'Engine/evaluation'
import { decompose } from 'Engine/mecanisms/utils'
import variations from 'Engine/mecanisms/variations'
import grille from 'Engine/mecanismViews/Grille'
import {
	liftTemporal2,
	liftTemporalNode,
	mapTemporal,
	temporalAverage
} from 'Engine/temporal'
import { parseUnit } from 'Engine/units'
import { lensPath, over } from 'ramda'
import {
	evaluatePlafondUntilActiveTranche,
	parseTranches
} from './trancheUtils'

export default function parse(parse, k, v) {
	if (v.composantes) {
		//mécanisme de composantes. Voir mécanismes.md/composantes
		return decompose(parse, k, v)
	}
	if (v.variations) {
		return variations(parse, k, v, true)
	}
	const defaultUnit = v['unité'] && parseUnit(v['unité'])
	let explanation = {
		assiette: parse(v.assiette),
		multiplicateur: v.multiplicateur ? parse(v.multiplicateur) : defaultNode(1),
		tranches: parseTranches(parse, v.tranches).map(
			over(lensPath(['montant', 'unit']), unit => unit ?? defaultUnit)
		)
	}
	return {
		explanation,
		evaluate,
		jsx: grille,
		category: 'mecanism',
		name: 'grille',
		type: 'numeric',
		unit: explanation.tranches[0].montant.unit
	}
}
const evaluateGrille = (tranches, evaluate) =>
	tranches.map(tranche => {
		if (tranche.isActive === false) {
			return tranche
		}
		const montant = evaluate(tranche.montant)
		return {
			...tranche,
			montant,
			nodeValue: montant.nodeValue,
			unit: montant.unit,
			missingVariables: mergeAllMissing([montant, tranche])
		}
	})

const evaluate = (
	cache,
	situationGate,
	parsedRules,
	node: ReturnType<typeof parse>
) => {
	const evaluate = evaluateNode.bind(null, cache, situationGate, parsedRules)
	const assiette = evaluate(node.explanation.assiette)
	const multiplicateur = evaluate(node.explanation.multiplicateur)
	const temporalTranchesPlafond = liftTemporal2(
		(assiette, multiplicateur) =>
			evaluatePlafondUntilActiveTranche(
				evaluate,
				{
					parsedTranches: node.explanation.tranches,
					assiette,
					multiplicateur
				},
				cache
			),
		liftTemporalNode(assiette),
		liftTemporalNode(multiplicateur)
	)
	const temporalTranches = mapTemporal(
		tranches => evaluateGrille(tranches, evaluate),
		temporalTranchesPlafond
	)

	const activeTranches = mapTemporal(tranches => {
		const activeTranche = tranches.find(tranche => tranche.isActive)
		if (activeTranche) {
			return [activeTranche]
		}
		const lastTranche = tranches[tranches.length - 1]
		if (lastTranche.isAfterActive === false) {
			return [{ nodeValue: false }]
		}
		return tranches.filter(tranche => tranche.isActive === null)
	}, temporalTranches)
	const temporalValue = mapTemporal(
		tranches => (tranches[0].isActive === null ? null : tranches[0].nodeValue),
		activeTranches
	)

	return {
		...node,
		nodeValue: temporalAverage(temporalValue),
		...(temporalValue.length > 1
			? {
					temporalValue
			  }
			: { missingVariables: mergeAllMissing(activeTranches[0].value) }),
		explanation: {
			assiette,
			multiplicateur,
			...(temporalTranches.length > 1
				? { temporalTranches }
				: { tranches: temporalTranches[0].value })
		},
		unit: activeTranches[0].value[0]?.unit ?? node.unit
	}
}
