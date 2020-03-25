import { expect } from 'chai'
import { chain, fromPairs, map, toPairs, trim } from 'ramda'
import {
	disambiguateRuleReference,
	enrichRule,
	ruleParents,
	rules,
	translateAll
} from '../source/engine/rules'

let nestedSituationToPathMap = situation => {
	if (situation == undefined) return {}
	let rec = (o, currentPath) =>
		typeof o === 'object'
			? chain(([k, v]) => rec(v, [...currentPath, trim(k)]), toPairs(o))
			: [[currentPath.join(' . '), o + '']]

	return fromPairs(rec(situation, []))
}

describe('enrichRule', function() {
	it('should extract the dotted name of the rule', function() {
		let rule = { nom: 'contrat salarié . CDD' }
		expect(enrichRule(rule)).to.have.property('name', 'CDD')
		expect(enrichRule(rule)).to.have.property(
			'dottedName',
			'contrat salarié . CDD'
		)
	})
})

describe('rule checks', function() {
	it('most input rules should have defaults', function() {
		let rulesNeedingDefault = rules.filter(
			r =>
				r.espace &&
				!r.simulateur &&
				(!r.formule || r.formule['une possibilité']) &&
				r.defaultValue == null &&
				r.question &&
				!['impôt . taux personnalisé'].includes(r.dottedName)
		)

		rulesNeedingDefault.map(r =>
			//eslint-disable-next-line
			console.log(
				'La règle suivante doit avoir une valeur par défaut : ',
				r.dottedName
			)
		)
		expect(rulesNeedingDefault).to.be.empty
	})
})

it('rules with a formula should not have defaults', function() {
	let errors = rules.filter(
		r =>
			r.formule !== undefined &&
			!r.formule['une possibilité'] &&
			r.defaultValue !== undefined
	)

	// variant formulas are an exception, their implementation is to refactor TODO
	expect(errors).to.be.empty
})
describe('translateAll', function() {
	it('should translate flat rules', function() {
		let rules = [
			{
				nom: 'foo . bar',
				titre: 'Titre',
				description: 'Description',
				question: 'Question'
			}
		]
		let translations = {
			'foo . bar': {
				'titre.en': 'TITRE',
				'description.en': 'DESC',
				'question.en': 'QUEST'
			}
		}

		let result = translateAll(translations, map(enrichRule, rules))

		expect(result[0]).to.have.property('titre', 'TITRE')
		expect(result[0]).to.have.property('description', 'DESC')
		expect(result[0]).to.have.property('question', 'QUEST')
	})
})
describe('misc', function() {
	it('should unnest nested form values', function() {
		let values = {
			'contrat salarié': { rémunération: { 'brut de base': '2300' } }
		}

		let pathMap = nestedSituationToPathMap(values)

		expect(pathMap).to.have.property(
			'contrat salarié . rémunération . brut de base',
			'2300'
		)
	})
	it('should procude an array of the parents of a rule', function() {
		let rawRules = [
			{ nom: 'CDD', question: 'CDD ?' },
			{ nom: 'CDD . taxe', formule: 'montant annuel / 12' },
			{
				nom: 'CDD . taxe . montant annuel',
				formule: '20 - exonération annuelle'
			},
			{
				nom: 'CDD . taxe . montant annuel . exonération annuelle',
				formule: 20
			}
		]

		let parents = ruleParents(rawRules.map(enrichRule)[3].dottedName)
		expect(parents).to.eql([
			['CDD', 'taxe', 'montant annuel'],
			['CDD', 'taxe'],
			['CDD']
		])
	})
	it("should disambiguate a reference to another rule in a rule, given the latter's namespace", function() {
		let rawRules = [
			{ nom: 'CDD', question: 'CDD ?' },
			{ nom: 'CDD . taxe', formule: 'montant annuel / 12' },
			{
				nom: 'CDD . taxe . montant annuel',
				formule: '20 - exonération annuelle'
			},
			{
				nom: 'CDD . taxe . montant annuel . exonération annuelle',
				formule: 20
			}
		]

		let enrichedRules = rawRules.map(enrichRule),
			resolved = disambiguateRuleReference(
				enrichedRules,
				enrichedRules[2],
				'exonération annuelle'
			)
		expect(resolved).to.eql(
			'CDD . taxe . montant annuel . exonération annuelle'
		)
	})
})
