import {loadGLTF, loadVideo} from "../libs/loader.js";
import {mockWithVideo} from "../libs/camera-mock.js";
import {createChromaMaterial} from "../libs/chroma-video.js";

const THREE = window.MINDAR.IMAGE.THREE;

const capture = (mindarThree) => {
  const {video, renderer, scene, camera} = mindarThree;
  const renderCanvas = renderer.domElement;

  // output canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = renderCanvas.width;
  canvas.height = renderCanvas.height;

  const sx = (video.clientWidth - renderCanvas.clientWidth) / 2 * video.videoWidth / video.clientWidth;
  const sy = (video.clientHeight - renderCanvas.clientHeight) / 2 * video.videoHeight / video.clientHeight;
  const sw = video.videoWidth - sx * 2; 
  const sh = video.videoHeight - sy * 2; 

  // renderer.preserveDrawingBuffer = true;
  renderer.render(scene, camera); // empty if not run
  context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  context.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);
  renderer.preserveDrawingBuffer = false;

  const data = canvas.toDataURL('image/png');

  const link = document.createElement('a');
  link.download = 'visitKL-' + new Date().getTime() + '.png';
  link.href = data;
  link.click();
}

const recordVideo = async (mindarThree, videoFile) => {
  const { video, renderer, scene, camera } = mindarThree;
  const renderCanvas = renderer.domElement;

  // Membuat canvas baru untuk merekam video
  const videoCanvas = document.createElement('canvas');
  const videoContext = videoCanvas.getContext('2d');
  videoCanvas.width = renderCanvas.width; // Atur lebar canvas baru
  videoCanvas.height = renderCanvas.height; // Atur tinggi canvas baru
  
  // Mengupdate canvas baru dengan video dari kamera dan objek AR
  const updateCanvas = () => {

    const sx = (video.clientWidth - renderCanvas.clientWidth) / 2 * video.videoWidth / video.clientWidth;
    const sy = (video.clientHeight - renderCanvas.clientHeight) / 2 * video.videoHeight / video.clientHeight;
    const sw = video.videoWidth - sx * 2; 
    const sh = video.videoHeight - sy * 2; 
    // renderer.preserveDrawingBuffer = true;
    renderer.render(scene, camera); // empty if not run
    videoContext.drawImage(video, sx, sy, sw, sh, 0, 0, videoCanvas.width, videoCanvas.height);
    videoContext.drawImage(renderCanvas, 0, 0, videoCanvas.width, videoCanvas.height);
    renderer.preserveDrawingBuffer = false;

    // Memanggil updateCanvas secara berulang
    requestAnimationFrame(updateCanvas); 
  };

  updateCanvas(); // Memulai pembaruan canvas

  // Mendapatkan stream audio dari mikrofon
  // const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioStream = videoFile.captureStream(30); // Mengambil stream audio dari video
  
  // Menggabungkan stream video dan audio
  const combinedStream = new MediaStream([
    videoCanvas.captureStream(30).getTracks()[0], // Video track
    ...audioStream.getTracks() // Audio tracks
  ]);

  // Menggunakan MediaRecorder untuk merekam video dari canvas baru
  const recordedChunks = [];
  const mediaRecorder = new MediaRecorder(combinedStream, { // Menangkap stream dari canvas baru
    mimeType: 'video/webm; codecs=h264' // Format video yang didukung
  });

  // Menggunakan RecordRTC untuk merekam video
  // const stream = videoCanvas.captureStream(30); // Menangkap stream dari renderCanvas
  // const recorder = window.RecordRTC(stream, {
  //   type: 'video',
  //   mimeType: 'video/mp4', // Format video yang didukung
  //   // Anda dapat menambahkan pengaturan lain di sini jika diperlukan
  // });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data); // Menambahkan data rekaman
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/mp4' }); // Membuat blob dari potongan video
    const url = URL.createObjectURL(blob); // Membuat URL untuk blob
    const link = document.createElement('a'); // Membuat elemen link untuk mengunduh
    link.href = url;
    link.download = 'visitkl-video-' + new Date().getTime() + '.mp4'; // Nama file unduhan
    link.click(); // Mengklik link untuk mengunduh
  };

  document.querySelector("#sound-on").style.display = "none";
  document.querySelector("#sound-off").style.display = "none";
  videoFile.muted = false;
  // Mulai merekam
  mediaRecorder.start();
  // recorder.startRecording(); // Mulai merekam
  console.log("Recording started");

  // Mengubah tampilan tombol
  document.querySelector("#record").style.display = "none"; // Sembunyikan tombol rekam
  document.querySelector("#stop").style.display = "block"; // Tampilkan tombol berhenti

  const stopRecording = () => {
    mediaRecorder.stop(); // Hentikan merekam
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.querySelector("#sound-on").style.display = "block";
    }
    console.log("Recording stopped");

    // Mengubah tampilan tombol
    document.querySelector("#record").style.display = "block"; // Tampilkan tombol rekam
    document.querySelector("#stop").style.display = "none"; // Sembunyikan tombol berhenti
  };

  document.querySelector("#stop").addEventListener("click", () => {
    stopRecording();
    document.querySelector("#record").style.display = 'block'
    document.querySelector("#stop").style.display = 'none'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  let video = null;
  const init = async() => {
    video = await loadVideo("./assets/ver2.mp4");
    video.play();
    video.pause();
    video.muted = false;

    video.addEventListener('loadeddata', () => {
      console.log('Video is loaded and ready to play');
    });

    video.addEventListener('error', (e) => {
      console.error('Error loading video:', e);
    });
  }

  const start = async() => {
    // mockWithVideo('../../assets/mock-videos/course-banner1.mp4');
    
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.body,
      imageTargetSrc: './assets/visitkl.mind',
      uiLoading: 'no',
    });
    const {renderer, scene, camera} = mindarThree;

    video = await loadVideo("./assets/ver2.mp4");
    video.loop = true;
    video.autoplay = true;
    video.muted = false;
    // video.play();
    // video.pause();

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      video.muted = true; // Mute video untuk autoplay di iOS
      video.crossOrigin = "anonymous"; // Jika video diambil dari server yang berbeda

      document.querySelector("#sound-on").style.display = 'block';
      document.querySelector("#sound-off").style.display = 'none';
    }

    
    const texture = new THREE.VideoTexture(video);
    const geometry = new THREE.PlaneGeometry(1, 1080/1920);
    //const material = new THREE.MeshBasicMaterial({map: texture});
    const material = createChromaMaterial(texture, 0x00ff00);
    const plane = new THREE.Mesh(geometry, material);
    // plane.rotation.x = Math.PI/2;
    plane.position.y = -0.1;
    plane.scale.multiplyScalar(1.8);

    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(plane);

    anchor.onTargetFound = () => {
      video.play();
    }
    anchor.onTargetLost = () => {
      video.pause();
    }

    document.querySelector("#capture").addEventListener("click", () => {
      capture(mindarThree);
    });

    document.querySelector("#sound-on").addEventListener("click", () => {
      video.muted = false;
      document.querySelector("#sound-on").style.display = 'none';
      document.querySelector("#sound-off").style.display = 'block';
      console.log("Video unmuted.");
    });

    document.querySelector("#sound-off").addEventListener("click", () => {
      video.muted = true;
      document.querySelector("#sound-on").style.display = 'block';
      document.querySelector("#sound-off").style.display = 'none';
    });

    document.querySelector("#refresh").addEventListener("click", () => {
      console.log("Video stopped and reset to the beginning.");
      video.pause();
      video.currentTime = 0;
      video.play();
    });

    document.querySelector("#record").addEventListener("click", () => {
      recordVideo(mindarThree, video);
      document.querySelector("#record").style.display = 'none'
      document.querySelector("#stop").style.display = 'block'
    });

    if (!MediaRecorder.isTypeSupported('video/webm')) { // <2>
      console.warn('video/webm is not supported')
    }

    // const renderCanvas = renderer.domElement;

    // // Membuat canvas baru untuk merender video
    // const videoCanvas = document.createElement('canvas');
    // const videoContext = videoCanvas.getContext('2d');
    // videoCanvas.width = renderCanvas.width; // Atur lebar canvas baru
    // videoCanvas.height = renderCanvas.height; // Atur tinggi canvas baru


    // // Menggunakan MediaRecorder untuk merekam video dari canvas
    // const recordedChunks = [];
    // const mediaRecorder = new MediaRecorder(renderCanvas.captureStream(30), { // Menangkap stream dari canvas
    //   mimeType: 'video/mp4; codecs=avc1.42E01E, mp4a.40.2' // Format video yang didukung
    // });

    // mediaRecorder.ondataavailable = (event) => {
    //   if (event.data.size > 0) {
    //     recordedChunks.push(event.data); // Menambahkan data rekaman
    //   }
    // };

    // mediaRecorder.onstop = () => {
    //   const blob = new Blob(recordedChunks, { type: 'video/mp4' }); // Membuat blob dari potongan video
    //   const url = URL.createObjectURL(blob); // Membuat URL untuk blob
    //   const link = document.createElement('a'); // Membuat elemen link untuk mengunduh
    //   link.href = url;
    //   link.download = 'recorded-video.mp4'; // Nama file unduhan
    //   link.click(); // Mengklik link untuk mengunduh
    // };

    // const updateCanvas = () => {
    //   // Menggambar video dari MindAR ke canvas baru
    //   const sx = (video.clientWidth - renderCanvas.clientWidth) / 2 * video.videoWidth / video.clientWidth;
    //   const sy = (video.clientHeight - renderCanvas.clientHeight) / 2 * video.videoHeight / video.clientHeight;
    //   const sw = video.videoWidth - sx * 2; 
    //   const sh = video.videoHeight - sy * 2; 
  
    //   videoContext.drawImage(video, sx, sy, sw, sh, 0, 0, videoCanvas.width, videoCanvas.height); // Menggambar video ke canvas baru
    //   renderer.render(scene, camera); // Merender scene ke canvas asli
    //   requestAnimationFrame(updateCanvas); // Memanggil updateCanvas secara berulang
    // };

    // updateCanvas();

    // const buttonStart = document.querySelector('#record')
    // const buttonStop = document.querySelector('#stop')
    // // const videoLive = document.querySelector('#videoLive')
    // const videoRecorded = document.querySelector('#videoRecorded')
  
    // const stream = await navigator.mediaDevices.getUserMedia({ // <1>
    //   video: true,
    //   audio: true,
    // })
  
    // videoLive.srcObject = stream
  
  
    // const mediaRecorder = new MediaRecorder(stream, { // <3>
    //   mimeType: 'video/webm',
    // })
  
    // mediaRecorder.addEventListener('dataavailable', event => {
    //   videoRecorded.src = URL.createObjectURL(event.data) // <6>
  
    //   // download video
    //   const link = document.createElement('a');
    //   link.href = videoRecorded.src;
    //   link.download = 'video.webm';
    //   link.click();
    // })

    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  }

  start();
});

const init2 = async () => {
    let blobs; 
    let rec; 
    let stream; 
    let canvasStream; 
    let canvasStreamTrack; 
    let frames = []; 
    let preferredDevice = 0; 
    let width; let frameIdx = 0; 
    let height; 
    let recording = false; 
    let playback = false; 
    let devices = []; 
    let canvasOutput = document.getElementById('output'); 
    let context = canvasOutput.getContext('2d'); 
    let preferredCodecs = ['video/webm; codecs=vp9', 'video/webm; codecs.vp8', 'video/mp4']; 
    let mimeType = preferredCodecs.filter(mime => MediaRecorder.isTypeSupported(mime))[0]; console.log('Supported mimeType', mimeType); 

    let getStream = async () => { 
      const deviceId = (devices.length > 0) ? devices[preferredDevice % devices.length].deviceId : undefined; // Setting high constraints like this seems to kill Canvas captureStream() // const videoConstraint = { width: 1280, height: 720, deviceId: deviceId }; const videoConstraint = { deviceId: deviceId }; return await navigator.mediaDevices.getOserMedia({video: videoConstraint, audio: false}); 
      let renderFrame = () => {
        let imageData;
        if (canvasStreamTrack === undefined) return;

        if (recording) {
          context.drawImage(bufferVideo, 0, 0);
          imageData = context.getImageData(0, 0, width, height);
          frames.push(imageData);
        }else{
          if( playback === false){
            context.drawImage(bufferVideo, 0, 0);
          }else{
            canvasOutput.width = canvasStream.width;
            frameIdx = (++frameIdx) % frames.length;
            context.putImageData(frames[frameIdx], 0, 0);
            if(frameIdx === 0 && rec.state != 'inactive'){
              rec.stop();
            }
          }
        }

        canvasStreamTrack.requestFrame();

        requestAnimationFrame(renderFrame);
      }
      
    }
  
  }

