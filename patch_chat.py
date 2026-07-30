import re

file_path = 'src/app/widgets/chat-widget/chat-widget.component.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ion-infinite-scroll
content = content.replace(
    '<ion-refresher slot="fixed" (ionRefresh)="handleRefresh()" [disabled]="isDoodling">',
    '''<ion-infinite-scroll position="top" (ionInfinite)="loadOlderMessages()" [disabled]="allMessagesLoaded">
          <ion-infinite-scroll-content loadingSpinner="bubbles" loadingText="Cargando mensajes anteriores..."></ion-infinite-scroll-content>
        </ion-infinite-scroll>
        <ion-refresher slot="fixed" (ionRefresh)="handleRefresh()" [disabled]="isDoodling">'''
)

# 2. Add properties
content = content.replace(
    'lastKnownMessageId: number = 0;',
    '''lastKnownMessageId: number = 0;
  allMessagesLoaded: boolean = false;
  isPolling: boolean = false;'''
)

# 3. Update polling interval in ngAfterViewInit
content = content.replace(
    'this.pollingInterval = setInterval(() => {\n      this.loadMessages(true);\n    }, 5000);',
    '''this.pollingInterval = setInterval(() => {
      this.pollNewMessages();
    }, 5000);'''
)

# 4. Replace loadMessages with new loadMessages, pollNewMessages and loadOlderMessages
load_messages_pattern = re.compile(r'async loadMessages\(isBackground = false\).*?(?=^\s+async onScroll)', re.MULTILINE | re.DOTALL)

new_methods = '''async loadOlderMessages(event?: any) {
    if (this.messages.length > 0) {
      const firstId = this.messages[0].id;
      try {
        const older = await this.api.getChatMessages(firstId, undefined);
        if (older && older.length > 0) {
          let oldScrollHeight = 0;
          if (this.msgContainer) {
            oldScrollHeight = await this.msgContainer.getScrollElement().then((el: any) => el.scrollHeight);
          }
          this.messages = [...older, ...this.messages];
          this.processMessages();
          this.cdr.detectChanges();
          
          if (this.msgContainer && oldScrollHeight > 0) {
             const newScrollHeight = await this.msgContainer.getScrollElement().then((el: any) => el.scrollHeight);
             if (newScrollHeight > oldScrollHeight) {
                const diff = newScrollHeight - oldScrollHeight;
                const currentScrollTop = await this.msgContainer.getScrollElement().then((el: any) => el.scrollTop);
                await this.msgContainer.scrollToPoint(0, currentScrollTop + diff, 0);
             }
          }
          if (older.length < 30) this.allMessagesLoaded = true;
        } else {
          this.allMessagesLoaded = true;
        }
      } catch (e) {}
    } else {
      this.allMessagesLoaded = true;
    }
    if (event) event.target.complete();
  }

  async pollNewMessages() {
    if (this.isPolling) return;
    this.isPolling = true;
    try {
      if (this.messages.length > 0) {
         const lastId = this.messages[this.messages.length - 1].id;
         const newMsgs = await this.api.getChatMessages(undefined, lastId);
         if (newMsgs && newMsgs.length > 0) {
            this.messages = [...this.messages, ...newMsgs];
            this.processNewIncomingMessages(newMsgs);
         }
      } else {
         await this.loadMessages(true);
      }
    } catch(e) {} finally {
      this.isPolling = false;
    }
  }

  processNewIncomingMessages(newMsgs: any[]) {
      this.processMessages();
      let shouldScroll = !this.isUserScrolledUp;
      let newCount = 0;
      
      const latestMsg = newMsgs[newMsgs.length - 1];
      
      for (const msg of newMsgs) {
        if (!this.isMine(msg)) {
           newCount++;
        }
      }

      if (!shouldScroll) {
         this.unreadCount += newCount;
      } else {
         this.unreadCount = 0;
      }

      if (latestMsg && !this.isMine(latestMsg)) {
          if (this.isEmojiOnly(latestMsg.mensaje)) {
            this.triggerEmojiReaction(latestMsg.mensaje.trim());
          }
          if (latestMsg.mensaje && latestMsg.mensaje.includes('✨')) {
            this.triggerConfetti();
          }
          if (this.chatSound && this.chatSound !== 'default' && this.chatSound !== 'none') {
            const audio = new Audio(ssets/sounds/.wav);
            audio.play().catch((e:any) => console.log('Audio play error:', e));
          }
      }
      this.lastKnownMessageId = latestMsg.id;

      if (shouldScroll) {
         this.safeTimeout(() => this.scrollToBottom(false), 50);
         this.safeTimeout(() => this.scrollToBottom(true), 300);
      }
      
      this.cdr.detectChanges();
      
      const limitMessages = this.messages.slice(-30);
      Preferences.set({ key: 'chat_cache', value: JSON.stringify(limitMessages) }).catch(()=>{});
  }

  async fetchNewMessagesAndScroll() {
    await this.pollNewMessages();
    this.isUserScrolledUp = false;
    this.safeTimeout(() => this.scrollToBottom(false), 50);
    this.safeTimeout(() => this.scrollToBottom(true), 300);
  }

  async loadMessages(isBackground = false) {
    try {
      if (!isBackground) {
        const cache = await Preferences.get({ key: 'chat_cache' });
        if (cache.value) {
          this.messages = JSON.parse(cache.value);
          if (this.messages.length > 0) {
            this.lastKnownMessageId = this.messages[this.messages.length - 1].id;
          }
          this.processMessages();
          this.isLoading = false;
          this.cdr.detectChanges();
          this.safeTimeout(() => this.scrollToBottom(false), 50);
        }
      }

      const newMessages = await this.api.getChatMessages();
      
      if (JSON.stringify(this.messages) !== JSON.stringify(newMessages)) {
        this.messages = newMessages;
        if (this.messages.length < 30) this.allMessagesLoaded = true;
        
        let shouldScrollToBottom = !isBackground || !this.isUserScrolledUp;

        if (this.messages.length > 0) {
          const latestMsg = this.messages[this.messages.length - 1];
          this.lastKnownMessageId = latestMsg.id;
        }
        
        this.processMessages();
        if (shouldScrollToBottom) {
          this.unreadCount = 0;
          this.safeTimeout(() => this.scrollToBottom(false), 50);
          this.safeTimeout(() => this.scrollToBottom(true), 300);
        }
        const limitMessages = this.messages.slice(-30);
        await Preferences.set({ key: 'chat_cache', value: JSON.stringify(limitMessages) });
      }
    } catch (e) {
      if (!isBackground) {
        this.showError('No pudimos cargar los mensajes. ¿Hay conexión?');
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
'''

content = load_messages_pattern.sub(new_methods, content)

# 5. Replace wait this.loadMessages(); with wait this.fetchNewMessagesAndScroll(); where appropriate
content = content.replace('await this.loadMessages();\n      this.safeTimeout(() => this.scrollToBottom(), 100);', 'await this.fetchNewMessagesAndScroll();')
content = content.replace('await this.loadMessages();\n        this.safeTimeout(() => this.scrollToBottom(), 100);', 'await this.fetchNewMessagesAndScroll();')
content = content.replace('await this.loadMessages();\n      this.safeTimeout(() => this.scrollToBottom(), 100);', 'await this.fetchNewMessagesAndScroll();')
content = content.replace('this.loadMessages();\n      this.safeTimeout(() => this.scrollToBottom(), 100);', 'await this.fetchNewMessagesAndScroll();')
content = content.replace('await this.loadMessages();\n        this.safeTimeout(() => this.scrollToBottom(), 100);', 'await this.fetchNewMessagesAndScroll();')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
