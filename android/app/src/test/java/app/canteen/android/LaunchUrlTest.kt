package app.canteen.android

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LaunchUrlTest {
    private val origin = "https://canteen.example"

    @Test fun acceptsSameOriginPathsAndExplicitDefaultPort() {
        assertTrue(isAllowedLaunchUrl("https://canteen.example/p/thread?reply=answer#reply", origin))
        assertTrue(isAllowedLaunchUrl("https://CANTEEN.example:443/campus", origin))
        assertTrue(isAllowedLaunchUrl("HTTPS://canteen.example/campus", origin))
        assertTrue(isAllowedLaunchUrl("http://localhost:3000/join?next=%2Fcampus", "http://localhost:3000"))
    }

    @Test fun rejectsForeignOriginsCredentialsAndMalformedLinks() {
        listOf(
            "https://evil.example/campus",
            "https://canteen.example.evil.example/",
            "https://canteen.example:444/",
            "http://canteen.example/campus",
            "https://user@canteen.example/",
            "javascript:alert(1)",
            "file:///data/user/0/",
            "//canteen.example/campus",
            "/campus",
            "https://canteen.example\\@evil.example/",
            "https://canteen.example/%zz",
        ).forEach { assertFalse(it, isAllowedLaunchUrl(it, origin)) }
        assertFalse(isAllowedLaunchUrl("http://localhost:4000/", "http://localhost:3000"))
    }
}
