import { expect } from 'chai'
import { enrichRule } from '../source/engine/rules'
import { analyseMany, parseAll } from '../source/engine/traverse'

describe('controls', function() {
	let rawRules = [
			{
				nom: 'net',
				formule: 'brut - cotisation'
			},
			{ nom: 'cotisation', formule: 235 },
			{ nom: 'résident en France', formule: 'oui' },
			{
				nom: 'brut',
				format: 'euro',
				question: 'Quel est le salaire brut ?',
				contrôles: [
					{
						si: 'brut < 300',
						niveau: 'bloquant',
						message:
							'Malheureux, je crois que vous vous êtes trompé dans votre saisie.'
					},
					{
						si: 'brut < 1000',
						niveau: 'bloquant',
						message: 'Toujours pas, nous avons des standards en France !'
					},
					{
						si: 'brut < 1500',
						niveau: 'avertissement',
						message: 'Toujours pas, nous avons des standards en France !'
					},
					{
						si: 'brut > 100000',
						niveau: 'information',
						message: 'Oulah ! Oulah !'
					},
					{
						si: {
							'toutes ces conditions': ['brut > 1000000', 'résident en France']
						},
						niveau: 'information',
						message: 'Vous êtes un contribuable hors-pair !'
					}
				]
			}
		],
		rules = rawRules.map(enrichRule),
		parsedRules = parseAll(rules)

	it('Should parse blocking controls', function() {
		let controls = parsedRules.find(r => r.controls).controls
		expect(
			controls.filter(
				({ level, isInputControl }) => level == 'bloquant' && isInputControl
			)
		).to.have.lengthOf(2)
	})

	it('Should block the engine evaluation if blocking input controls trigger', function() {
		let situationGate = dottedName => ({ brut: 400 }[dottedName]),
			{ blockingInputControls } = analyseMany(parsedRules, ['net'])(
				situationGate
			)

		expect(blockingInputControls).to.have.lengthOf(1)
	})
	it('Should not block the engine evaluation if no blocking input controls trigger', function() {
		let situationGate = dottedName => ({ brut: 1200 }[dottedName]),
			{ blockingInputControls } = analyseMany(parsedRules, ['net'])(
				situationGate
			)

		expect(blockingInputControls).to.be.undefined
	})
	it('Should allow imbricated conditions', function() {
		let situationGate = dottedName => ({ brut: 2000000 }[dottedName]),
			{ controls } = analyseMany(parsedRules, ['net'])(situationGate)

		expect(
			controls.find(
				({ message }) => message === 'Vous êtes un contribuable hors-pair !'
			)
		).to.exist
	})
})
