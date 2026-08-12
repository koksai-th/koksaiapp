import React, { useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";


export default function PermissionSetup({ onComplete }) {

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState({});


  const requestAllPermissions = async () => {

    setLoading(true);


    const result = {

      location: false,

      notification: false,

      storage: true,

      microphone: false

    };


    // ===============================
    // LOCATION
    // ===============================

    try {


      if (Capacitor.isNativePlatform()) {


        const location =
          await Geolocation.requestPermissions();


        result.location =
          location.location === "granted";


      } else {


        await new Promise((resolve,reject)=>{


          navigator.geolocation.getCurrentPosition(

            () => {

              result.location = true;

              resolve();

            },


            () => {

              result.location = false;

              reject();

            },


            {

              enableHighAccuracy:true,

              timeout:10000,

              maximumAge:0

            }

          );


        });


      }


    } catch(error) {

      console.log(
        "Location error:",
        error
      );

      result.location=false;

    }




    // Notification is requested from a dedicated popup after setup completes.
    // Keeping it behind an explicit button click also satisfies browser rules.





    // ===============================
    // MICROPHONE
    // ===============================


    try {


      const stream =

        await navigator.mediaDevices.getUserMedia({

          audio:true

        });



      result.microphone=true;



      stream
        .getTracks()
        .forEach(track=>track.stop());



    } catch(error){


      console.log(
        "Microphone error:",
        error
      );


      result.microphone=false;


    }




    // ===============================
    // SAVE RESULT
    // ===============================


    setStatus(result);



    localStorage.setItem(

      "permission_setup",

      JSON.stringify(result)

    );



    localStorage.setItem(

      "permission_setup_completed",

      "true"

    );



    setLoading(false);



    if(onComplete){

      onComplete(result);

    }


  };




  return (

    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-5">


      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg">



        <h1 className="text-xl font-black text-center">

          🔐 ตั้งค่าการใช้งาน

        </h1>



        <p className="mt-3 text-center text-sm text-slate-600">

          เพื่อให้ระบบกู้ภัยทำงานครบถ้วน

          <br/>

          กรุณาอนุญาตสิทธิ์ต่อไปนี้

        </p>




        <div className="mt-6 space-y-4">


          <div>

            📍 ตำแหน่ง

            <br/>

            <span className="text-sm text-gray-500">

              ใช้ส่งพิกัดเมื่อออกปฏิบัติงาน

            </span>

          </div>



          <div>
            🔔 แจ้งเตือน
            <br/>
            <span className="text-sm text-gray-500">
              ระบบจะขอสิทธิ์ผ่านป๊อปอัพหลังขั้นตอนนี้
            </span>
          </div>




          <div>

            📷 รูปภาพและไฟล์

            <br/>

            <span className="text-sm text-gray-500">

              แนบรูปเหตุการณ์และหลักฐาน

            </span>

          </div>




          <div>

            🎤 ไมโครโฟน

            <br/>

            <span className="text-sm text-gray-500">

              ใช้สื่อสารเสียงในภารกิจ

            </span>

          </div>



        </div>




        <button

          onClick={requestAllPermissions}

          disabled={loading}

          className="mt-8 w-full rounded-xl bg-red-700 py-3 font-bold text-white"

        >

          {

            loading

            ? "กำลังตั้งค่า..."

            : "อนุญาตทั้งหมด"

          }


        </button>




        {

          Object.keys(status).length > 0 && (


            <pre className="mt-4 text-xs bg-gray-100 p-3 rounded">


              {

                JSON.stringify(

                  status,

                  null,

                  2

                )

              }


            </pre>


          )

        }



      </div>


    </div>


  );


}
