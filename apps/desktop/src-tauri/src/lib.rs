// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    window::Color,
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};

#[cfg(desktop)]
use tauri_plugin_autostart::AutoLaunchManager;
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

/// Application settings structure for frontend-backend communication
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub launch_at_login: bool,
    pub hotkey: String,
    pub show_in_menu_bar: bool,
    pub appearance: String, // "light", "dark", "system"
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            hotkey: "CommandOrControl+Space".to_string(),
            show_in_menu_bar: true,
            appearance: "system".to_string(),
        }
    }
}

/// Returns the application version from Cargo.toml
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Opens an external URL in the default browser
#[tauri::command]
fn open_external_url(url: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Enables launch at login
#[cfg(desktop)]
#[tauri::command]
fn enable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    let manager = app.state::<AutoLaunchManager>();
    manager.enable().map_err(|e| e.to_string())
}

/// Disables launch at login
#[cfg(desktop)]
#[tauri::command]
fn disable_autostart(app: tauri::AppHandle) -> Result<(), String> {
    let manager = app.state::<AutoLaunchManager>();
    manager.disable().map_err(|e| e.to_string())
}

/// Checks if launch at login is enabled
#[cfg(desktop)]
#[tauri::command]
fn is_autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    let manager = app.state::<AutoLaunchManager>();
    manager.is_enabled().map_err(|e| e.to_string())
}

/// Window configuration constants
pub mod config {
    /// Default window title
    pub const WINDOW_TITLE: &str = "Blackbox";
    /// Default window label/identifier
    pub const WINDOW_LABEL: &str = "main";
    /// Settings window label
    pub const SETTINGS_LABEL: &str = "settings";
    /// Default window width
    pub const WINDOW_WIDTH: f64 = 400.0;
    /// Default window height
    pub const WINDOW_HEIGHT: f64 = 300.0;
    /// Settings window width
    pub const SETTINGS_WIDTH: f64 = 480.0;
    /// Settings window height
    pub const SETTINGS_HEIGHT: f64 = 400.0;

    // Menu item IDs
    pub const MENU_OPEN_ID: &str = "open";
    pub const MENU_FEEDBACK_ID: &str = "feedback";
    pub const MENU_MANUAL_ID: &str = "manual";
    pub const MENU_TROUBLESHOOTING_ID: &str = "troubleshooting";
    pub const MENU_SLACK_ID: &str = "slack";
    pub const MENU_TWITTER_ID: &str = "twitter";
    pub const MENU_YOUTUBE_ID: &str = "youtube";
    pub const MENU_ABOUT_ID: &str = "about";
    pub const MENU_UPDATES_ID: &str = "updates";
    pub const MENU_SETTINGS_ID: &str = "settings";
    pub const MENU_QUIT_ID: &str = "quit";

    // External URLs
    pub const URL_FEEDBACK: &str = "https://github.com/blackbox-dev/blackbox/issues/new";
    pub const URL_MANUAL: &str = "https://blackbox.dev/docs";
    pub const URL_TROUBLESHOOTING: &str = "https://blackbox.dev/docs/troubleshooting";
    pub const URL_SLACK: &str = "https://blackbox.dev/community";
    pub const URL_TWITTER: &str = "https://twitter.com/blackboxdev";
    pub const URL_YOUTUBE: &str = "https://youtube.com/@blackboxdev";
}

/// Represents the visibility state of a window
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowVisibility {
    Visible,
    Hidden,
}

impl WindowVisibility {
    /// Returns the toggled visibility state
    pub fn toggle(self) -> Self {
        match self {
            WindowVisibility::Visible => WindowVisibility::Hidden,
            WindowVisibility::Hidden => WindowVisibility::Visible,
        }
    }

    /// Returns true if the window should be visible
    pub fn is_visible(self) -> bool {
        matches!(self, WindowVisibility::Visible)
    }
}

impl From<bool> for WindowVisibility {
    fn from(visible: bool) -> Self {
        if visible {
            WindowVisibility::Visible
        } else {
            WindowVisibility::Hidden
        }
    }
}

/// Window dimensions configuration
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WindowDimensions {
    pub width: f64,
    pub height: f64,
}

impl WindowDimensions {
    /// Creates new window dimensions
    pub const fn new(width: f64, height: f64) -> Self {
        Self { width, height }
    }

    /// Returns the default window dimensions
    pub const fn default_dimensions() -> Self {
        Self::new(config::WINDOW_WIDTH, config::WINDOW_HEIGHT)
    }

    /// Validates that dimensions are positive
    pub fn is_valid(&self) -> bool {
        self.width > 0.0 && self.height > 0.0
    }
}

impl Default for WindowDimensions {
    fn default() -> Self {
        Self::default_dimensions()
    }
}

/// Menu event handler result
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MenuAction {
    Open,
    Feedback,
    Manual,
    Troubleshooting,
    Slack,
    Twitter,
    YouTube,
    About,
    CheckUpdates,
    Settings,
    Quit,
    Unknown,
}

impl MenuAction {
    /// Parses a menu event ID into a MenuAction
    pub fn from_id(id: &str) -> Self {
        match id {
            config::MENU_OPEN_ID => MenuAction::Open,
            config::MENU_FEEDBACK_ID => MenuAction::Feedback,
            config::MENU_MANUAL_ID => MenuAction::Manual,
            config::MENU_TROUBLESHOOTING_ID => MenuAction::Troubleshooting,
            config::MENU_SLACK_ID => MenuAction::Slack,
            config::MENU_TWITTER_ID => MenuAction::Twitter,
            config::MENU_YOUTUBE_ID => MenuAction::YouTube,
            config::MENU_ABOUT_ID => MenuAction::About,
            config::MENU_UPDATES_ID => MenuAction::CheckUpdates,
            config::MENU_SETTINGS_ID => MenuAction::Settings,
            config::MENU_QUIT_ID => MenuAction::Quit,
            _ => MenuAction::Unknown,
        }
    }

    /// Returns true if this action should exit the application
    pub fn should_exit(&self) -> bool {
        matches!(self, MenuAction::Quit)
    }

    /// Returns the URL to open for external link actions
    pub fn get_url(&self) -> Option<&'static str> {
        match self {
            MenuAction::Feedback => Some(config::URL_FEEDBACK),
            MenuAction::Manual => Some(config::URL_MANUAL),
            MenuAction::Troubleshooting => Some(config::URL_TROUBLESHOOTING),
            MenuAction::Slack => Some(config::URL_SLACK),
            MenuAction::Twitter => Some(config::URL_TWITTER),
            MenuAction::YouTube => Some(config::URL_YOUTUBE),
            _ => None,
        }
    }
}

/// Handles the tray icon click event logic
/// Returns the new visibility state that should be applied
pub fn handle_tray_click(current_visibility: WindowVisibility) -> WindowVisibility {
    current_visibility.toggle()
}

/// Determines if a window exists and what action to take
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowAction {
    /// Toggle visibility of existing window
    Toggle(WindowVisibility),
    /// Create a new window
    Create,
}

impl WindowAction {
    /// Determines the appropriate action based on window existence and visibility
    pub fn determine(window_exists: bool, current_visibility: Option<bool>) -> Self {
        if window_exists {
            let visibility = current_visibility
                .map(WindowVisibility::from)
                .unwrap_or(WindowVisibility::Hidden);
            WindowAction::Toggle(visibility.toggle())
        } else {
            WindowAction::Create
        }
    }
}

/// Helper to open a URL in the default browser
fn open_url_helper(app: &tauri::AppHandle, url: &str) {
    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_url(url, None::<&str>);
}

/// Helper to show or create a window.
/// When `navigate` is true and the window already exists, it navigates to the given URL
/// before showing the window. This is useful for deep-linking to a specific tab.
fn show_or_create_window(
    app: &tauri::AppHandle,
    label: &str,
    title: &str,
    url: &str,
    width: f64,
    height: f64,
    navigate: bool,
) {
    if let Some(window) = app.get_webview_window(label) {
        if navigate {
            let _ = window.eval(&format!(
                "window.location.replace('{}')",
                url
            ));
        }
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()))
            .title(title)
            .inner_size(width, height)
            .visible(false)
            .background_color(Color(0x1a, 0x1a, 0x1a, 0xff))
            .resizable(true)
            .center()
            .build();
    }
}

/// Runs the Tauri application
///
/// This function sets up the tray icon, menu, and window management
/// for the Blackbox desktop menu bar application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            open_external_url,
            enable_autostart,
            disable_autostart,
            is_autostart_enabled
        ])
        .setup(|app| {
            let version = env!("CARGO_PKG_VERSION");

            // Create menu items
            let open_item = MenuItemBuilder::with_id(config::MENU_OPEN_ID, "Open Blackbox")
                .accelerator("CmdOrCtrl+Space")
                .build(app)?;

            let feedback_item =
                MenuItemBuilder::with_id(config::MENU_FEEDBACK_ID, "Send us Feedback ↗").build(app)?;
            let manual_item =
                MenuItemBuilder::with_id(config::MENU_MANUAL_ID, "Manual ↗").build(app)?;
            let troubleshooting_item =
                MenuItemBuilder::with_id(config::MENU_TROUBLESHOOTING_ID, "Troubleshooting ↗")
                    .build(app)?;

            let slack_item = MenuItemBuilder::with_id(config::MENU_SLACK_ID, "Join our Community ↗")
                .build(app)?;
            let twitter_item =
                MenuItemBuilder::with_id(config::MENU_TWITTER_ID, "Follow us on X ↗").build(app)?;
            let youtube_item =
                MenuItemBuilder::with_id(config::MENU_YOUTUBE_ID, "Subscribe to our Channel ↗")
                    .build(app)?;

            let version_item = MenuItemBuilder::new(format!("Version {}", version))
                .enabled(false)
                .build(app)?;
            let about_item =
                MenuItemBuilder::with_id(config::MENU_ABOUT_ID, "About Blackbox").build(app)?;
            let updates_item =
                MenuItemBuilder::with_id(config::MENU_UPDATES_ID, "Check for Updates").build(app)?;

            let settings_item = MenuItemBuilder::with_id(config::MENU_SETTINGS_ID, "Settings...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id(config::MENU_QUIT_ID, "Quit Blackbox")
                .accelerator("CmdOrCtrl+Q")
                .build(app)?;

            // Create separators
            let sep1 = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let sep3 = PredefinedMenuItem::separator(app)?;
            let sep4 = PredefinedMenuItem::separator(app)?;

            // Build the menu
            let menu = Menu::with_items(
                app,
                &[
                    &open_item,
                    &sep1,
                    &feedback_item,
                    &manual_item,
                    &troubleshooting_item,
                    &sep2,
                    &slack_item,
                    &twitter_item,
                    &youtube_item,
                    &sep3,
                    &version_item,
                    &about_item,
                    &updates_item,
                    &sep4,
                    &settings_item,
                    &quit_item,
                ],
            )?;

            // Build the tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .icon(tauri::include_image!("icons/tray-icon.png"))
                .icon_as_template(true)
                .tooltip("Blackbox")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    let action = MenuAction::from_id(event.id.as_ref());

                    // Handle URL actions
                    if let Some(url) = action.get_url() {
                        open_url_helper(app, url);
                        return;
                    }

                    // Handle other actions
                    match action {
                        MenuAction::Open => {
                            show_or_create_window(
                                app,
                                config::WINDOW_LABEL,
                                config::WINDOW_TITLE,
                                "/",
                                config::WINDOW_WIDTH,
                                config::WINDOW_HEIGHT,
                                false,
                            );
                        }
                        MenuAction::Settings => {
                            show_or_create_window(
                                app,
                                config::SETTINGS_LABEL,
                                "Settings",
                                "/settings",
                                config::SETTINGS_WIDTH,
                                config::SETTINGS_HEIGHT,
                                false,
                            );
                        }
                        MenuAction::About => {
                            show_or_create_window(
                                app,
                                config::SETTINGS_LABEL,
                                "Settings",
                                "/settings?tab=about",
                                config::SETTINGS_WIDTH,
                                config::SETTINGS_HEIGHT,
                                true,
                            );
                        }
                        MenuAction::CheckUpdates => {
                            // TODO: Implement update checking
                            // For now, show a message
                            let _ = app.emit("check-updates", ());
                        }
                        MenuAction::Quit => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Register global shortcut (Cmd+Space on macOS, Ctrl+Space on other platforms)
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcut("CommandOrControl+Space")?
                        .with_handler(move |_app, shortcut, event| {
                            if event.state == ShortcutState::Pressed {
                                // Check if it's our shortcut (Cmd/Ctrl + Space)
                                let is_cmd_space = shortcut.matches(Modifiers::META, Code::Space)
                                    || shortcut.matches(Modifiers::CONTROL, Code::Space);

                                if is_cmd_space {
                                    // Show or create the main window
                                    if let Some(window) = handle.get_webview_window(config::WINDOW_LABEL) {
                                        if window.is_visible().unwrap_or(false) {
                                            let _ = window.hide();
                                        } else {
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    } else {
                                        let _ = WebviewWindowBuilder::new(
                                            &handle,
                                            config::WINDOW_LABEL,
                                            WebviewUrl::App("/".into()),
                                        )
                                        .title(config::WINDOW_TITLE)
                                        .inner_size(config::WINDOW_WIDTH, config::WINDOW_HEIGHT)
                                        .visible(false)
                                        .background_color(Color(0x1a, 0x1a, 0x1a, 0xff))
                                        .resizable(true)
                                        .center()
                                        .build();
                                    }
                                }
                            }
                        })
                        .build(),
                )?;
            }

            // Hide from Dock - this is a menu bar only app
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide windows on close instead of destroying them
            // This keeps the tray app running in the background
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    mod window_visibility_tests {
        use super::*;

        #[test]
        fn test_toggle_from_visible() {
            let visibility = WindowVisibility::Visible;
            assert_eq!(visibility.toggle(), WindowVisibility::Hidden);
        }

        #[test]
        fn test_toggle_from_hidden() {
            let visibility = WindowVisibility::Hidden;
            assert_eq!(visibility.toggle(), WindowVisibility::Visible);
        }

        #[test]
        fn test_is_visible_when_visible() {
            assert!(WindowVisibility::Visible.is_visible());
        }

        #[test]
        fn test_is_visible_when_hidden() {
            assert!(!WindowVisibility::Hidden.is_visible());
        }

        #[test]
        fn test_from_bool_true() {
            assert_eq!(WindowVisibility::from(true), WindowVisibility::Visible);
        }

        #[test]
        fn test_from_bool_false() {
            assert_eq!(WindowVisibility::from(false), WindowVisibility::Hidden);
        }

        #[test]
        fn test_double_toggle_returns_original() {
            let original = WindowVisibility::Visible;
            assert_eq!(original.toggle().toggle(), original);

            let original = WindowVisibility::Hidden;
            assert_eq!(original.toggle().toggle(), original);
        }
    }

    mod window_dimensions_tests {
        use super::*;

        #[test]
        fn test_new_dimensions() {
            let dims = WindowDimensions::new(800.0, 600.0);
            assert_eq!(dims.width, 800.0);
            assert_eq!(dims.height, 600.0);
        }

        #[test]
        fn test_default_dimensions() {
            let dims = WindowDimensions::default_dimensions();
            assert_eq!(dims.width, config::WINDOW_WIDTH);
            assert_eq!(dims.height, config::WINDOW_HEIGHT);
        }

        #[test]
        fn test_default_trait() {
            let dims = WindowDimensions::default();
            assert_eq!(dims.width, 400.0);
            assert_eq!(dims.height, 300.0);
        }

        #[test]
        fn test_is_valid_with_positive_dimensions() {
            let dims = WindowDimensions::new(100.0, 100.0);
            assert!(dims.is_valid());
        }

        #[test]
        fn test_is_valid_with_zero_width() {
            let dims = WindowDimensions::new(0.0, 100.0);
            assert!(!dims.is_valid());
        }

        #[test]
        fn test_is_valid_with_zero_height() {
            let dims = WindowDimensions::new(100.0, 0.0);
            assert!(!dims.is_valid());
        }

        #[test]
        fn test_is_valid_with_negative_dimensions() {
            let dims = WindowDimensions::new(-100.0, -100.0);
            assert!(!dims.is_valid());
        }
    }

    mod menu_action_tests {
        use super::*;

        #[test]
        fn test_from_id_all_actions() {
            assert_eq!(MenuAction::from_id("open"), MenuAction::Open);
            assert_eq!(MenuAction::from_id("feedback"), MenuAction::Feedback);
            assert_eq!(MenuAction::from_id("manual"), MenuAction::Manual);
            assert_eq!(
                MenuAction::from_id("troubleshooting"),
                MenuAction::Troubleshooting
            );
            assert_eq!(MenuAction::from_id("slack"), MenuAction::Slack);
            assert_eq!(MenuAction::from_id("twitter"), MenuAction::Twitter);
            assert_eq!(MenuAction::from_id("youtube"), MenuAction::YouTube);
            assert_eq!(MenuAction::from_id("about"), MenuAction::About);
            assert_eq!(MenuAction::from_id("updates"), MenuAction::CheckUpdates);
            assert_eq!(MenuAction::from_id("settings"), MenuAction::Settings);
            assert_eq!(MenuAction::from_id("quit"), MenuAction::Quit);
        }

        #[test]
        fn test_from_id_unknown() {
            assert_eq!(MenuAction::from_id("unknown"), MenuAction::Unknown);
            assert_eq!(MenuAction::from_id(""), MenuAction::Unknown);
            assert_eq!(MenuAction::from_id("random"), MenuAction::Unknown);
        }

        #[test]
        fn test_should_exit_quit() {
            assert!(MenuAction::Quit.should_exit());
        }

        #[test]
        fn test_should_exit_other_actions() {
            assert!(!MenuAction::Open.should_exit());
            assert!(!MenuAction::Settings.should_exit());
            assert!(!MenuAction::Unknown.should_exit());
        }

        #[test]
        fn test_get_url_external_links() {
            assert_eq!(
                MenuAction::Feedback.get_url(),
                Some(config::URL_FEEDBACK)
            );
            assert_eq!(MenuAction::Manual.get_url(), Some(config::URL_MANUAL));
            assert_eq!(
                MenuAction::Troubleshooting.get_url(),
                Some(config::URL_TROUBLESHOOTING)
            );
            assert_eq!(MenuAction::Slack.get_url(), Some(config::URL_SLACK));
            assert_eq!(MenuAction::Twitter.get_url(), Some(config::URL_TWITTER));
            assert_eq!(MenuAction::YouTube.get_url(), Some(config::URL_YOUTUBE));
        }

        #[test]
        fn test_get_url_non_link_actions() {
            assert_eq!(MenuAction::Open.get_url(), None);
            assert_eq!(MenuAction::Settings.get_url(), None);
            assert_eq!(MenuAction::Quit.get_url(), None);
            assert_eq!(MenuAction::Unknown.get_url(), None);
        }
    }

    mod window_action_tests {
        use super::*;

        #[test]
        fn test_determine_window_exists_and_visible() {
            let action = WindowAction::determine(true, Some(true));
            assert_eq!(action, WindowAction::Toggle(WindowVisibility::Hidden));
        }

        #[test]
        fn test_determine_window_exists_and_hidden() {
            let action = WindowAction::determine(true, Some(false));
            assert_eq!(action, WindowAction::Toggle(WindowVisibility::Visible));
        }

        #[test]
        fn test_determine_window_exists_visibility_unknown() {
            let action = WindowAction::determine(true, None);
            // Defaults to hidden, so toggle should make it visible
            assert_eq!(action, WindowAction::Toggle(WindowVisibility::Visible));
        }

        #[test]
        fn test_determine_window_does_not_exist() {
            let action = WindowAction::determine(false, None);
            assert_eq!(action, WindowAction::Create);
        }

        #[test]
        fn test_determine_window_does_not_exist_ignores_visibility() {
            // Even if visibility is provided (shouldn't happen), it should still create
            let action = WindowAction::determine(false, Some(true));
            assert_eq!(action, WindowAction::Create);
        }
    }

    mod handle_tray_click_tests {
        use super::*;

        #[test]
        fn test_handle_tray_click_when_visible() {
            let result = handle_tray_click(WindowVisibility::Visible);
            assert_eq!(result, WindowVisibility::Hidden);
        }

        #[test]
        fn test_handle_tray_click_when_hidden() {
            let result = handle_tray_click(WindowVisibility::Hidden);
            assert_eq!(result, WindowVisibility::Visible);
        }
    }

    mod config_tests {
        use super::*;

        #[test]
        fn test_window_config() {
            assert_eq!(config::WINDOW_TITLE, "Blackbox");
            assert_eq!(config::WINDOW_LABEL, "main");
            assert_eq!(config::SETTINGS_LABEL, "settings");
            assert_eq!(config::WINDOW_WIDTH, 400.0);
            assert_eq!(config::WINDOW_HEIGHT, 300.0);
            assert_eq!(config::SETTINGS_WIDTH, 480.0);
            assert_eq!(config::SETTINGS_HEIGHT, 400.0);
        }

        #[test]
        fn test_menu_ids() {
            assert_eq!(config::MENU_OPEN_ID, "open");
            assert_eq!(config::MENU_FEEDBACK_ID, "feedback");
            assert_eq!(config::MENU_MANUAL_ID, "manual");
            assert_eq!(config::MENU_TROUBLESHOOTING_ID, "troubleshooting");
            assert_eq!(config::MENU_SLACK_ID, "slack");
            assert_eq!(config::MENU_TWITTER_ID, "twitter");
            assert_eq!(config::MENU_YOUTUBE_ID, "youtube");
            assert_eq!(config::MENU_ABOUT_ID, "about");
            assert_eq!(config::MENU_UPDATES_ID, "updates");
            assert_eq!(config::MENU_SETTINGS_ID, "settings");
            assert_eq!(config::MENU_QUIT_ID, "quit");
        }

        #[test]
        fn test_external_urls() {
            assert!(config::URL_FEEDBACK.starts_with("https://"));
            assert!(config::URL_MANUAL.starts_with("https://"));
            assert!(config::URL_TROUBLESHOOTING.starts_with("https://"));
            assert!(config::URL_SLACK.starts_with("https://"));
            assert!(config::URL_TWITTER.starts_with("https://"));
            assert!(config::URL_YOUTUBE.starts_with("https://"));
        }
    }
}
