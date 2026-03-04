"""
BCG Time Tracker - Global Hotkey (Ctrl+Shift+B)
Runs silently in background. Opens the web app with Quick Add dialog.
Close from Task Manager if needed (process: pythonw.exe / hotkey.pyw)
"""
import keyboard
import webbrowser
import time

URL = "https://guillermosantospi01-hue.github.io/bcg-timetracker/#quickadd"

def on_hotkey():
    webbrowser.open(URL)

keyboard.add_hotkey("ctrl+alt+t", on_hotkey)

# Keep alive silently
while True:
    time.sleep(1)
