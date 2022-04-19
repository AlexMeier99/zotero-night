/* eslint-disable no-constant-condition */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { css } from './css'
import { debug } from './debug'

declare const Zotero: any
declare const ZoteroContextPane: any
declare const Zotero_Tabs: any
// declare const Components: any

const monkey_patch_marker = 'NightMonkeyPatched'

// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-inner-declarations, prefer-arrow/prefer-arrow-functions
function patch(object, method, patcher) {
  if (object[method][monkey_patch_marker]) return
  object[method] = patcher(object[method])
  object[method][monkey_patch_marker] = true
}

class Night {
  // tslint:disable-line:variable-name
  private initialized = false
  private globals: Record<string, any>
  private strings: any
  private _tabsAdded: boolean
  public _nordFilter: string
  public _darkFilter: string
  public _sepiaFilter: string

  constructor() {
    this._nordFilter =
      'invert(81%) sepia(23%) saturate(459%) hue-rotate(181deg) brightness(90%) contrast(93%)'

    this._darkFilter =
      'brightness(0.91) grayscale(0.15) invert(0.95) sepia(0.65) hue-rotate(180deg)'
  }

  /**
   * Open the preference window for Night
   */
  public openPreferenceWindow(paneID: any, action: any) {
    const io = {
      pane: paneID,
      action,
    }
    // @ts-expect-error
    window.openDialog(
      'chrome://zotero-night/content/options.xul',
      'night-options',
      `chrome,titlebar,toolbar,centerscreen${Zotero.Prefs.get(
        'browser.preferences.instantApply',
        true
      )}`
        ? 'dialog=no'
        : 'modal',
      io
    )
  }

  public getPref(pref: string) {
    return Zotero.Prefs.get(`extensions.night.${pref}`, true) as string
  }

  public setPref(pref: string, value: any) {
    return Zotero.Prefs.set(`extensions.night.${pref}`, value, true) as string
  }

  private hasToggle(readerWindow: Window): boolean {
    return !!readerWindow.document.querySelector('#night-toggle')
  }
  private hasFilter(readerWindow: Window): boolean {
    return !!readerWindow.document.querySelector('#filter-style')
  }

  private createFilterStyle(readerWindow: Window, nextStyle: string) {
    const filterStyle = readerWindow.document.createElement('style')
    const filter = nextStyle === 'match' ? this._nordFilter : this._darkFilter
    filterStyle.setAttribute('id', 'filter-style')
    filterStyle.textContent = `[theme='dark'] #viewer .page .canvasWrapper { filter:  ${filter} }`
    return filterStyle
  }

  // TODO: Just change the textcontents of the style, don't remove and append it constantly
  public toggleOnClick(readerWindow: Window, nextStyle: string) {
    if (this.hasFilter(readerWindow)) {
      readerWindow.document.querySelector('#filter-style').remove()
    }
    if (nextStyle === 'none') return

    const filterStyle = this.createFilterStyle(readerWindow, nextStyle)
    readerWindow.document.head.appendChild(filterStyle)
    return
  }

  // TODO: Figure out some way to remember per window setting
  private addToggleButton(readerWindow: Window) {
    if (this.hasToggle(readerWindow)) return

    const toggle: HTMLButtonElement =
      readerWindow.document.createElement('button')

    toggle.setAttribute('id', 'night-toggle')
    const defaultFilter = this.getPref('default_pdf')

    toggle.setAttribute('data:filter', defaultFilter)
    const icon =
      defaultFilter === 'match' ? '✨' : defaultFilter === 'dark' ? '🌙' : '☀️'
    toggle.textContent = icon
    toggle.setAttribute(
      'style',
      'filter:none !important; height: 20px; width: 20px'
    )
    toggle.onclick = () => {
      const filter = toggle.getAttribute('data:filter')
      const nextStyle =
        filter === 'none' ? 'match' : filter === 'match' ? 'dark' : 'none'

      const icon = filter === 'none' ? '✨' : filter === 'match' ? '🌙' : '☀️'

      toggle.textContent = icon
      this.toggleOnClick(readerWindow, nextStyle)
      toggle.setAttribute('data:filter', nextStyle)
    }

    const middleToolbar = readerWindow.document.querySelector(
      '#toolbarViewerMiddle'
    )
    middleToolbar.appendChild(toggle)

    const st = this.createFilterStyle(readerWindow, defaultFilter)
    readerWindow.document.head.appendChild(st)
  }

  public addStyleToEditor(editorWindow: Window) {
    const editorDoc = editorWindow.document
    const style = editorDoc.createElement('style')
    style.setAttribute('id', 'noteStyle')
    style.textContent = css
    editorDoc.head.append(style)
  }
  public hasStyle(editorWindow: any): boolean {
    return !!editorWindow.document.querySelector('#pageStyle')
  }
  public editorNeedsStyle(): boolean {
    const editorWin3 = window[(Zotero_Tabs._tabs?.length ?? 0) + 1]
    return !this.hasStyle(editorWin3)
  }

  private tryToAddStyleToEditor() {
    const editorWin3 = window[(Zotero_Tabs._tabs?.length ?? 0) + 1]
    const needsStyle = !this.hasStyle(editorWin3)

    if (needsStyle) {
      debug('should have added things to the editor')
      debug(Zotero_Tabs._tabs?.length)
      this.addStyleToEditor(editorWin3)
      this._tabsAdded = true
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  public async load(globals: Record<string, any>) {
    this.globals = globals

    if (this.initialized) return
    this.initialized = true

    this._tabsAdded = false
    const mainWindow = window.document.querySelector('#main-window')
    mainWindow.setAttribute('theme', 'dark')

    const editorWin1 = window[0]
    this.addStyleToEditor(editorWin1)
    const editorWin2 = window[1]
    this.addStyleToEditor(editorWin2)

    // const toggle = window.document.querySelector('#zotero-tb-toggle-notes-pane')
    // toggle.addEventListener('click', async () => {
    //   debug('clickyyy')
    //   const editor = ZoteroContextPane.getActiveEditor()
    //   if (editor) {
    //     const currentEditor = editor.getCurrentInstance()

    //     await currentEditor._initPromise

    //     const noteWindow = currentEditor._iframeWindow
    //     noteWindow.addEventListener('DOMContentLoaded', (ev: any) => {
    //       debug('note loaded')
    //       const noteDoc = noteWindow.document

    //       if (noteDoc.querySelector('pageStyle')) return

    //       const noteStyle = noteDoc.createElement('style')

    //       noteStyle.setAttribute('id', 'pageStyle')
    //       noteStyle.textContent = css

    //       const noteHeader = noteDoc.querySelector('header')
    //       noteHeader?.appendChild(noteStyle)
    //     })
    //   }
    // })

    const notifierCallback = {
      notify: async (event: string, type, ids: string[], extraData) => {
        debug({ event })
        debug({ type })
        if (event === 'select') {
          this.editorNeedsStyle() && this.tryToAddStyleToEditor()
          try {
            // add stylesheet to the editor window
            const id = ids[0] // 'tab-WJgG9Ojg'
            // const allTabs = Array.from(
            //   //  there are some "context" vboxes, no clue what they do but i hate m
            //   document.querySelectorAll('vbox[id^=tab]:not([class])')
            // )
            const tabIndex = Zotero_Tabs._tabs.findIndex((tab) => tab.id === id)

            debug(`Select tab event tabindex: ${tabIndex}`)

            if (tabIndex === -1) return

            const activeTabWindow = window[1 + tabIndex]
            this.addToggleButton(activeTabWindow)

            debug(`Select tab event activeTabWindow: ${activeTabWindow}`)

            // const reader = Zotero.Reader.getByTabID(ids[0])
            // const doc = reader?._iframeWindow?.document
            debug('Select tab event window loaded')
            const doc = activeTabWindow?.document
            if (!doc) return
            if (doc.querySelector('#pageStyle')) return

            const style = doc.createElement('style')
            style.setAttribute('id', 'pageStyle')
            style.textContent = css
            const header = doc.querySelector('header')
            header?.appendChild(style)
            doc.querySelector('html[dir]').setAttribute('theme', 'dark')
          } catch (e) {
            debug('Error in Select tab notifierCallback')
            debug(e)
          }
        }
        if (event === 'add') {
          // debug(`Added tab ${ids[0]}`)
          // debug(extraData)
          // // const magicNumber = 10000
          // const id = ids[0] // 'tab-WJgG9Ojg'
          // const allTabs = Array.from(
          //   //  there are some "context" vboxes, no clue what they do but i hate m
          //   document.querySelectorAll('vbox[id^=tab]:not([class])')
          // )
          // const tabIndex = allTabs.findIndex((tab) => tab.id === id)
          // const activeTabWindow = window[1 + tabIndex]
          // debug(activeTabWindow)
          // debug(tabIndex)
          // // const activeTabWindow = Zotero.Reader.getByTabID(id)._iframeWindow
          // if (activeTabWindow.document.readyState === 'complete') {
          //   try {
          //     debug(activeTabWindow.document.readyState)
          //     // const reader = Zotero.Reader.getByTabID(id)
          //     // debug({ reader: JSON.stringify(reader, null, 2) })
          //     const style = activeTabWindow.document.createElement('style')
          //     style.setAttribute('id', 'pageStyle')
          //     style.textContent = css
          //     debug(style)
          //     activeTabWindow.document.head.appendChild(style)
          //     activeTabWindow.document
          //       .querySelector('html[dir]')
          //       .setAttribute('theme', 'dark')
          //     debug('delayyyy')
          //   } catch (e) {
          //     debug('Error in readystate check tab add notifierCallback')
          //     debug(e)
          //   }
          //   return
          // }
          // activeTabWindow.addEventListener('DOMContentLoaded', (e) => {
          //   try {
          //     debug(e)
          //     // const reader = Zotero.Reader.getByTabID(id)
          //     // debug({ reader: JSON.stringify(reader, null, 2) })
          //     const style = activeTabWindow.document.createElement('style')
          //     style.setAttribute('id', 'pageStyle')
          //     style.textContent = css
          //     debug(style)
          //     activeTabWindow.document.head.appendChild(style)
          //     activeTabWindow.document
          //       .querySelector('html[dir]')
          //       .setAttribute('theme', 'dark')
          //   } catch (e) {
          //     debug('Error in readystate check tab add notifierCallback')
          //     debug(e)
          //   }
          // })
          // window.document[2].appendChild(style);
        }
      },
    }
    Zotero.Notifier.registerObserver(notifierCallback, ['tab'])

    this.strings = globals.document.getElementById('zotero-night-strings')
  }
}

if (!Zotero.Night) Zotero.Night = new Night()
