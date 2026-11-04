"use client";
import {useEffect,useState} from "react";
export default function TimezoneOffsetField(){const [offset,setOffset]=useState("0");useEffect(()=>{setOffset(String(new Date().getTimezoneOffset()))},[]);return <input type="hidden" name="timezone_offset" value={offset}/>;}
