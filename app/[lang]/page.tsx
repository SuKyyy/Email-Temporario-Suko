import { getDictionary, isValidLocale, defaultLocale } from "@/lib/i18n"
import { EmailPage } from "@/components/email-page"

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const locale = isValidLocale(lang) ? lang : defaultLocale
  const dict = getDictionary(locale)
  return <EmailPage dict={dict} lang={locale} />
}
