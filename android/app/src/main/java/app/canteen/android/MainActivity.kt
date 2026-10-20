package app.canteen.android

import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsCallback
import com.google.androidbrowserhelper.trusted.LauncherActivity

class MainActivity : LauncherActivity() {
    override fun getLaunchingUrl(): Uri = getUrlForIntent(intent) ?: super.getLaunchingUrl()

    override fun getUrlForIntent(intent: Intent): Uri? =
        super.getUrlForIntent(intent)?.takeIf {
            isAllowedLaunchUrl(it.toString(), BuildConfig.SITE_ORIGIN)
        }

    // Connectivity failures belong to the browser's recovery UI, not a native app crash.
    override fun getCustomTabsCallback(): CustomTabsCallback = CustomTabsCallback()
}
