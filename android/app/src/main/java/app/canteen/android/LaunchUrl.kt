package app.canteen.android

import java.net.URI

internal fun isAllowedLaunchUrl(value: String, siteOrigin: String): Boolean = try {
    val candidate = URI(value)
    val origin = URI(siteOrigin)
    fun port(uri: URI) = if (uri.port != -1) uri.port else if (uri.scheme.equals("https", ignoreCase = true)) 443 else 80

    candidate.rawUserInfo == null &&
        candidate.scheme.equals(origin.scheme, ignoreCase = true) &&
        candidate.host != null && candidate.host.equals(origin.host, ignoreCase = true) &&
        port(candidate) == port(origin)
} catch (_: Exception) {
    false
}
