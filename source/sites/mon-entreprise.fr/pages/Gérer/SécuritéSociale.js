
import { React, T } from 'Components'
import { Helmet } from 'react-helmet'
import { useTranslation } from 'react-i18next'
import * as Animate from 'Ui/animate'
import Video from './Video'


export default function SocialSecurity() {
	const { t } = useTranslation()
	return (
		<>
			<Helmet>
				<title>
					{t('sécu.page.titre', 'Sécurité sociale')}
				</title>
				<meta name="description" content={t('sécu.page.description')} />
			</Helmet>

			<Animate.fromBottom>
				<T k="sécu.content">
					<h1>Protection sociale </h1>
					<p>
						En France, tous les travailleurs bénéficient d'une protection
						sociale de qualité. Ce système obligatoire repose sur la solidarité
						et vise à assurer le{' '}
						<strong>bien-être général de la population</strong>.
					</p>
					<p>
						En contrepartie du paiement de{' '}
						<strong>contributions sociales</strong>, le cotisant est couvert sur
						la maladie, les accidents du travail, chômage ou encore la retraite.
					</p>
				</T>

				<section style={{ marginTop: '2rem' }}>
					<Video />
				</section>
			</Animate.fromBottom>
		</>
	)
}
