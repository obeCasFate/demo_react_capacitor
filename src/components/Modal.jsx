import { forwardRef, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import Button from "./Button.jsx";

// export function Modal2({ children, buttonCaption }, ref) {
//   const dialog = useRef();
//   useImperativeHandle(ref, () => {
//     return {
//       // expose components or properties outside modal component
//       open() {
//         // open <- custom method
//         dialog.current.showModal(); // showModal is a built-in method provided by dialog element
//       },
//     };
//   });
//   return createPortal(
//     <dialog ref={dialog}>
//       {children}
//       {/* Closes dialog */}
//       <form method="dialog">
//         <button>{buttonCaption}</button>
//       </form>
//     </dialog>,
//     document.getElementById("modal-root")
//   );
// }

// React older version
const Modal = forwardRef(function Modal({ children, buttonCaption }, ref) {
  const dialog = useRef();
  useImperativeHandle(ref, () => {
    return {
      // expose components or properties outside modal component
      open() {
        // open <- custom method
        dialog.current.showModal(); // showModal is a built-in method provided by dialog element
      },
    };
  });
  return createPortal(
    // backdrop:bg-stone-900/90 <- adding a background that has some transparency
    <dialog
      ref={dialog}
      className="backdrop:bg-stone-900/90 p-4 rounded-md shadow-md"
    >
      {children}
      {/* Closes dialog */}
      <form method="dialog" className="mt-4 text-right">
        <Button>{buttonCaption}</Button>
      </form>
    </dialog>,
    document.getElementById("modal-root")
  );
});

export default Modal;
