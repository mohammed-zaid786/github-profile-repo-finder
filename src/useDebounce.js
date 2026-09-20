import { useState, useEffect } from "react";

//custom hook jo value ko tabhi update karega jab typing ruke 
export function useDebounce(value, delay = 500) {
    const [debounceValue, setDebounceValue] = useState(value);
    
    useEffect(() => {
        // set timer
        const timer = setTimeout(()  => {
            setDebounceValue(value);
        }, delay);

        // cleanup: if user type before 500ms so old timer will cancle
        return () => {
            clearTimeout(timer);
        };
        }, [value, delay]);
        return debounceValue;
    }



    //learning 
    //what is debouncing :-if someone type react then api calls  r, re,rea,reac,react iski jagah ek hi api call lagegi 500ms tak
    // what is cleanup function: useeffect me cleartimeout timer purane time ko cancle karta hai jisse memory leak aur race condition nhi hoti
    