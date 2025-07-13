import { Resend } from 'resend'
import { env } from '~/config/environment'

const resend = new Resend(env.RESEND_API_KEY)

const sendEmail = async (recipientEmail, customSubject, customHtmlContent) => {
  try {
    const result = await resend.emails.send({
      from: `${env.ADMIN_EMAIL_NAME} <${env.ADMIN_EMAIL_ADDRESS}>`,
      to: [recipientEmail],
      subject: customSubject,
      html: customHtmlContent
    })
    return result
  } catch (error) { throw error }
}

export const ResendProvider = {
  sendEmail
}
