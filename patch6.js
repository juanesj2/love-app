const fs = require('fs');
const path = require('path');

let homeFile = path.join(__dirname, 'src/app/home/home.page.ts');
let homeContent = fs.readFileSync(homeFile, 'utf8');

const oldHomeTakePicture = `  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        direction: CameraDirection.Front, // Usar la cámara delantera por defecto
        promptLabelHeader: 'Añadir Foto',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'De la Galería',
        promptLabelPicture: 'Tomar Foto'
      });

      if (image.webPath) {
        // Convert webPath to File object
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        this.pendingPhotoFile = new File([blob], "camera_photo.jpg", { type: blob.type });
        this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
        this.pendingPhotoText = '';
      }
    } catch (e: any) {
      if (e.message && e.message.includes('User cancelled')) {
        console.log('User cancelled camera');
      } else {
        console.error(e);
      }
    }
  }`;

const newHomeTakePicture = `  async takePicture() {
    this.presentPhotoOptions(async (source) => {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: source,
          direction: CameraDirection.Front // Usar la cámara delantera por defecto
        });

        if (image.webPath) {
          // Convert webPath to File object
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          this.pendingPhotoFile = new File([blob], "camera_photo.jpg", { type: blob.type });
          this.pendingPhotoPreview = URL.createObjectURL(this.pendingPhotoFile);
          this.pendingPhotoText = '';
        }
      } catch (e: any) {
        if (e.message && e.message.includes('User cancelled')) {
          console.log('User cancelled camera');
        } else {
          console.error(e);
        }
      }
    });
  }`;

homeContent = homeContent.replace(oldHomeTakePicture, newHomeTakePicture);
fs.writeFileSync(homeFile, homeContent, 'utf8');

console.log('home.page.ts takePicture updated!');
