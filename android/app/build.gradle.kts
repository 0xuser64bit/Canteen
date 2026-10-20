import java.net.URI
import java.util.Properties

plugins {
    id("com.android.application")
}

val origin = URI(providers.gradleProperty("canteenOrigin").getOrElse("http://localhost:3000"))
require(
    origin.scheme in setOf("http", "https") && origin.host != null &&
        origin.rawUserInfo == null && origin.rawQuery == null && origin.rawFragment == null &&
        origin.rawPath in setOf("", "/") && origin.port in -1..65535
) { "canteenOrigin must be an HTTP(S) origin, without a path, credentials, query or fragment." }
require(origin.scheme == "https" || origin.host in setOf("localhost", "127.0.0.1")) {
    "HTTP is allowed only for local development. Use HTTPS for a deployed Canteen."
}
val signingFile = providers.gradleProperty("canteenSigningProperties").orNull?.let(::File)
val signingValues = Properties().apply { signingFile?.inputStream()?.use { load(it) } }

val siteOrigin = "${origin.scheme}://${origin.rawAuthority}"

android {
    namespace = "app.canteen.android"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.canteen.android"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "0.2.0"
        manifestPlaceholders["siteScheme"] = origin.scheme
        manifestPlaceholders["siteHost"] = origin.host
        manifestPlaceholders["siteUrl"] = "$siteOrigin/campus"
        buildConfigField("String", "SITE_ORIGIN", "\"$siteOrigin\"")
        resValue(
            "string", "asset_statements",
            """[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"web","site":"$siteOrigin"}}]""".replace("\"", "\\\"")
        )
    }

    buildFeatures {
        buildConfig = true
        resValues = true
    }

    signingConfigs {
        if (signingFile != null) {
            create("release") {
                storeFile = file(requireNotNull(signingValues.getProperty("storeFile")))
                storePassword = requireNotNull(signingValues.getProperty("storePassword"))
                keyAlias = requireNotNull(signingValues.getProperty("keyAlias"))
                keyPassword = requireNotNull(signingValues.getProperty("keyPassword"))
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
            if (signingFile != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

val validateReleaseOrigin = tasks.register("validateReleaseOrigin") {
    doLast {
        require(origin.scheme == "https" && origin.host !in setOf("localhost", "127.0.0.1")) {
            "Release requires -PcanteenOrigin=https://your-canonical-canteen-domain"
        }
    }
}
tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(validateReleaseOrigin)
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.4")
    testImplementation("junit:junit:4.13.2")
}
