// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder,
};

/// Window configuration constants
pub mod config {
    /// Default window title
    pub const WINDOW_TITLE: &str = "Blackbox";
    /// Default window label/identifier
    pub const WINDOW_LABEL: &str = "main";
    /// Default window width
    pub const WINDOW_WIDTH: f64 = 400.0;
    /// Default window height
    pub const WINDOW_HEIGHT: f64 = 300.0;
    /// Menu item ID for quit action
    pub const MENU_QUIT_ID: &str = "quit";
    /// Menu item label for quit action
    pub const MENU_QUIT_LABEL: &str = "Quit Blackbox";
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
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MenuAction {
    Quit,
    Unknown,
}

impl MenuAction {
    /// Parses a menu event ID into a MenuAction
    pub fn from_id(id: &str) -> Self {
        match id {
            config::MENU_QUIT_ID => MenuAction::Quit,
            _ => MenuAction::Unknown,
        }
    }

    /// Returns true if this action should exit the application
    pub fn should_exit(&self) -> bool {
        matches!(self, MenuAction::Quit)
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

/// Runs the Tauri application
///
/// This function sets up the tray icon, menu, and window management
/// for the Blackbox desktop menu bar application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Create menu items for the tray
            let quit_i = MenuItem::with_id(
                app,
                config::MENU_QUIT_ID,
                config::MENU_QUIT_LABEL,
                true,
                None::<&str>,
            )?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            // Build the tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    let action = MenuAction::from_id(event.id.as_ref());
                    if action.should_exit() {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();

                        // Determine action based on window state
                        let window = app.get_webview_window(config::WINDOW_LABEL);
                        let action = WindowAction::determine(
                            window.is_some(),
                            window.as_ref().and_then(|w| w.is_visible().ok()),
                        );

                        match action {
                            WindowAction::Toggle(new_visibility) => {
                                if let Some(window) = window {
                                    if new_visibility.is_visible() {
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    } else {
                                        let _ = window.hide();
                                    }
                                }
                            }
                            WindowAction::Create => {
                                let dims = WindowDimensions::default_dimensions();
                                let window = WebviewWindowBuilder::new(
                                    app,
                                    config::WINDOW_LABEL,
                                    WebviewUrl::default(),
                                )
                                .title(config::WINDOW_TITLE)
                                .inner_size(dims.width, dims.height)
                                .decorations(true)
                                .resizable(false)
                                .always_on_top(true)
                                .visible(true)
                                .build();

                                if let Ok(win) = window {
                                    let _ = win.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
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
        fn test_from_id_quit() {
            assert_eq!(MenuAction::from_id("quit"), MenuAction::Quit);
        }

        #[test]
        fn test_from_id_unknown() {
            assert_eq!(MenuAction::from_id("unknown"), MenuAction::Unknown);
            assert_eq!(MenuAction::from_id(""), MenuAction::Unknown);
            assert_eq!(MenuAction::from_id("settings"), MenuAction::Unknown);
        }

        #[test]
        fn test_should_exit_quit() {
            assert!(MenuAction::Quit.should_exit());
        }

        #[test]
        fn test_should_exit_unknown() {
            assert!(!MenuAction::Unknown.should_exit());
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
        fn test_config_values() {
            assert_eq!(config::WINDOW_TITLE, "Blackbox");
            assert_eq!(config::WINDOW_LABEL, "main");
            assert_eq!(config::WINDOW_WIDTH, 400.0);
            assert_eq!(config::WINDOW_HEIGHT, 300.0);
            assert_eq!(config::MENU_QUIT_ID, "quit");
            assert_eq!(config::MENU_QUIT_LABEL, "Quit Blackbox");
        }
    }
}
