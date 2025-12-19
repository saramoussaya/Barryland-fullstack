const nodemailer = require('nodemailer');

// Configuration du transporteur email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Templates d'emails
const emailTemplates = {
  welcome: (data) => ({
    subject: 'Bienvenue sur BarryLand !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981; font-size: 28px; margin: 0;">BarryLand</h1>
          <p style="color: #6B7280; margin: 5px 0;">Votre plateforme immobilière en Guinée</p>
        </div>
        
        <div style="background: #F9FAFB; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
          <h2 style="color: #1F2937; margin-bottom: 20px;">Bienvenue ${data.userName} ! 🎉</h2>
          <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
            Nous sommes ravis de vous accueillir sur BarryLand, la première plateforme immobilière moderne de Guinée.
          </p>
          <p style="color: #4B5563; line-height: 1.6; margin-bottom: 20px;">
            En tant que <strong>${data.userType === 'buyer' ? 'acheteur' : data.userType === 'seller' ? 'vendeur' : 'agent immobilier'}</strong>, 
            vous avez maintenant accès à toutes nos fonctionnalités pour ${data.userType === 'buyer' ? 'trouver le bien de vos rêves' : 'gérer et promouvoir vos biens immobiliers'}.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1F2937; margin-bottom: 15px;">Prochaines étapes :</h3>
          <ul style="color: #4B5563; line-height: 1.8;">
            ${data.userType === 'buyer' ? `
              <li>Explorez nos milliers d'annonces immobilières</li>
              <li>Configurez vos alertes de recherche personnalisées</li>
              <li>Sauvegardez vos biens favoris</li>
              <li>Contactez directement les propriétaires</li>
            ` : `
              <li>Complétez votre profil professionnel</li>
              <li>Publiez votre première annonce</li>
              <li>Gérez vos biens depuis votre tableau de bord</li>
              <li>Suivez les statistiques de vos annonces</li>
            `}
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${data.dashboardUrl || '#'}" 
             style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Accéder à mon tableau de bord
          </a>
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; text-align: center;">
          <p style="color: #6B7280; font-size: 14px; margin-bottom: 10px;">
            Besoin d'aide ? Contactez notre équipe support :
          </p>
          <p style="color: #10B981; font-size: 14px;">
            📧 ${data.supportEmail || 'support@barryland.gn'} | 📞 +224 XX XX XX XX
          </p>
        </div>
      </div>
    `
  }),

  'contact-owner': (data) => ({
    subject: `Nouveau message concernant votre bien: ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981; font-size: 24px; margin: 0;">BarryLand</h1>
        </div>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1F2937; margin-bottom: 15px;">Bonjour ${data.ownerName},</h2>
          <p style="color: #4B5563; line-height: 1.6;">
            Vous avez reçu un nouveau message concernant votre bien immobilier sur BarryLand.
          </p>
        </div>

        ${data.propertyImage ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${data.propertyImage}" alt="${data.propertyTitle}" 
                 style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px;">
          </div>
        ` : ''}

        <div style="background: white; border: 1px solid #E5E7EB; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #1F2937; margin-bottom: 10px;">Bien concerné :</h3>
          <p style="color: #10B981; font-weight: bold; margin-bottom: 15px;">${data.propertyTitle}</p>
          
          <h3 style="color: #1F2937; margin-bottom: 10px;">Message de ${data.senderName} :</h3>
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
            <p style="color: #4B5563; line-height: 1.6; margin: 0;">${data.message}</p>
          </div>
        </div>

        <div style="background: #EFF6FF; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #1F2937; margin-bottom: 15px;">Coordonnées du contact :</h3>
          <p style="color: #4B5563; margin: 5px 0;"><strong>Nom :</strong> ${data.senderName}</p>
          <p style="color: #4B5563; margin: 5px 0;"><strong>Email :</strong> ${data.senderEmail}</p>
          ${data.senderPhone ? `<p style="color: #4B5563; margin: 5px 0;"><strong>Téléphone :</strong> ${data.senderPhone}</p>` : ''}
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${data.propertyUrl || '#'}" 
             style="background: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Voir mon annonce
          </a>
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; text-align: center;">
          <p style="color: #6B7280; font-size: 12px;">
            Cet email a été envoyé automatiquement par BarryLand. Ne répondez pas à cet email, 
            contactez directement l'intéressé aux coordonnées fournies ci-dessus.
          </p>
        </div>
      </div>
    `
  }),

  'contact-copy': (data) => ({
    subject: `Copie de votre message concernant: ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981; font-size: 24px; margin: 0;">BarryLand</h1>
        </div>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1F2937; margin-bottom: 15px;">Bonjour ${data.senderName},</h2>
          <p style="color: #4B5563; line-height: 1.6;">
            Voici une copie du message que vous avez envoyé concernant le bien immobilier.
          </p>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h3 style="color: #1F2937; margin-bottom: 10px;">Bien concerné :</h3>
          <p style="color: #10B981; font-weight: bold; margin-bottom: 15px;">${data.propertyTitle}</p>
          
          <h3 style="color: #1F2937; margin-bottom: 10px;">Propriétaire contacté :</h3>
          <p style="color: #4B5563; margin-bottom: 15px;">${data.ownerName}</p>
          
          <h3 style="color: #1F2937; margin-bottom: 10px;">Votre message :</h3>
          <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981;">
            <p style="color: #4B5563; line-height: 1.6; margin: 0;">${data.message}</p>
          </div>
        </div>

        <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #92400E; font-size: 14px; margin: 0;">
            <strong>Note :</strong> Le propriétaire a reçu votre message et vos coordonnées. 
            Il vous contactera directement s'il est intéressé.
          </p>
        </div>

        <div style="text-align: center;">
          <p style="color: #6B7280; font-size: 12px;">
            Merci d'utiliser BarryLand pour vos recherches immobilières !
          </p>
        </div>
      </div>
    `
  }),

  'property-alert': (data) => ({
    subject: 'Nouvelle propriété correspondant à vos critères !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981; font-size: 24px; margin: 0;">BarryLand</h1>
          <p style="color: #6B7280;">🔔 Alerte de recherche</p>
        </div>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1F2937; margin-bottom: 15px;">Bonjour ${data.userName},</h2>
          <p style="color: #4B5563; line-height: 1.6;">
            Une nouvelle propriété correspondant à vos critères de recherche vient d'être publiée !
          </p>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
          ${data.propertyImage ? `
            <img src="${data.propertyImage}" alt="${data.propertyTitle}" 
                 style="width: 100%; height: 250px; object-fit: cover;">
          ` : ''}
          
          <div style="padding: 20px;">
            <h3 style="color: #1F2937; margin-bottom: 10px; font-size: 20px;">${data.propertyTitle}</h3>
            <p style="color: #10B981; font-size: 24px; font-weight: bold; margin-bottom: 10px;">${data.propertyPrice}</p>
            <p style="color: #6B7280; margin-bottom: 15px;">📍 ${data.propertyLocation}</p>
            
            <div style="text-align: center;">
              <a href="${data.propertyUrl}" 
                 style="background: #10B981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Voir cette propriété
              </a>
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; text-align: center;">
          <p style="color: #6B7280; font-size: 12px; margin-bottom: 10px;">
            Vous recevez cet email car vous avez configuré une alerte de recherche sur BarryLand.
          </p>
          <a href="${data.unsubscribeUrl}" style="color: #6B7280; font-size: 12px; text-decoration: underline;">
            Se désabonner des alertes
          </a>
        </div>
      </div>
    `
  }),

  'property-approved': (data) => ({
    subject: `Votre annonce a été approuvée : ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Bonjour ${data.ownerName || ''},</h2>
        <p>Votre annonce <strong>${data.propertyTitle}</strong> a été approuvée par notre équipe.</p>
        <p>Elle est désormais visible sur BarryLand : <a href="${data.propertyUrl}">Voir l'annonce</a></p>
      </div>
    `
  }),

  'property-rejected': (data) => ({
    subject: `Votre annonce a été rejetée : ${data.propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Bonjour ${data.ownerName || ''},</h2>
        <p>Votre annonce <strong>${data.propertyTitle}</strong> a été rejetée.</p>
        <p>Raison : ${data.rejectionReason || 'Non spécifiée'}</p>
        <p>Vous pouvez modifier votre annonce depuis votre tableau de bord et soumettre à nouveau.</p>
      </div>
    `
  }),

  'forgot-password': (data) => ({
    subject: 'Réinitialisation du mot de passe BarryLand',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #10B981; font-size: 24px; margin: 0;">Réinitialisation du mot de passe</h1>
        </div>
        <div style="background: #F9FAFB; padding: 20px; border-radius: 8px;">
          <p>Bonjour ${data.userName || 'utilisateur'},</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
          <p>Utilisez le code suivant pour réinitialiser votre mot de passe :</p>
          <h2 style="color:#111827">${data.code}</h2>
          <p>Ce code expire dans ${data.expiresMinutes || 15} minutes.</p>
          <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      </div>
    `
  }),

  newsletter: (data) => ({
    subject: data.subject || 'Newsletter BarryLand',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10B981; font-size: 28px; margin: 0;">BarryLand</h1>
          <p style="color: #6B7280;">Newsletter immobilière</p>
        </div>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1F2937; margin-bottom: 15px;">Bonjour ${data.userName},</h2>
        </div>

        <div style="background: white; border: 1px solid #E5E7EB; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          ${data.content}
        </div>

        <div style="border-top: 1px solid #E5E7EB; padding-top: 15px; text-align: center;">
          <p style="color: #6B7280; font-size: 12px; margin-bottom: 10px;">
            Vous recevez cette newsletter car vous êtes inscrit sur BarryLand.
          </p>
          <a href="${data.unsubscribeUrl}" style="color: #6B7280; font-size: 12px; text-decoration: underline;">
            Se désabonner
          </a>
        </div>
      </div>
    `
  })
};

// Fonction principale pour envoyer un email
const sendEmail = async ({ to, subject, template, data = {} }) => {
  try {
    // Construire le contenu email depuis le template
    if (!template || !emailTemplates[template]) {
      throw new Error(`Template email '${template}' non trouvé`);
    }

    const emailContent = emailTemplates[template](data);
    subject = subject || emailContent.subject;

    // Texte alternatif
    const textAlternative = emailContent.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Si la configuration SMTP est manquante, fournir un fallback en développement
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const msg = 'Configuration email manquante (EMAIL_USER/EMAIL_PASS).';
      if (process.env.NODE_ENV === 'production') {
        // En production, c'est bloquant
        throw new Error(msg);
      }

      // En dev: logguer le contenu de l'email (utile pour tests locaux) et renvoyer un résultat factice
      console.warn(`⚠️  ${msg} Utilisation du fallback de développement : l'email sera affiché dans la console.`);
      console.group(`DEV EMAIL -> ${to}`);
      console.log('Subject:', subject);
      console.log('HTML:', emailContent.html);
      console.log('Text:', textAlternative);
      console.groupEnd();

      // Retourner un objet simulant le résultat de nodemailer
      return { messageId: 'dev-fallback', response: 'logged-to-console' };
    }

    // Créer le transporteur maintenant que la configuration est présente
    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'BarryLand',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      html: emailContent.html,
      // Version texte alternative
      text: textAlternative
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email envoyé avec succès à ${to}:`, result.messageId);
    return result;

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Fonction pour envoyer des emails en lot
const sendBulkEmails = async (emails) => {
  const results = [];
  const batchSize = 10; // Traiter par lots de 10

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (emailData) => {
      try {
        const result = await sendEmail(emailData);
        return { success: true, email: emailData.to, result };
      } catch (error) {
        return { success: false, email: emailData.to, error: error.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Pause entre les lots pour éviter la surcharge
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  emailTemplates
};