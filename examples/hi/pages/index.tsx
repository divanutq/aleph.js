import { useDeno } from 'aleph'
import React, { useState } from 'react'
import Logo from '../components/logo.tsx'

export default function Home() {
    const [name, setName] = useState('')
    const version = useDeno(() => {
        return Deno.version
    })

    return (
        <div className="page">
            <link rel="stylesheet" href="../style/index.less" />
            <p className="logo"><Logo /></p>
            <h1>Welcome to use <strong>Aleph.js</strong>!</h1>
            <p className="name-input">
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value.trim())}
                    placeholder="What's your name?"
                />
            </p>
            <p className="go-button">
                <a href={`/hi/${name}`}><button disabled={name === ''}>Go</button></a>
            </p>
            <p className="links">
                <a href="https://alephjs.org" target="_blank">Website</a>
                <span></span>
                <a href="https://alephjs.org/docs/get-started" target="_blank">Get Started</a>
                <span></span>
                <a href="https://alephjs.org/docs" target="_blank">Docs</a>
                <span></span>
                <a href="https://github.com/alephjs/aleph.js" target="_blank">Github</a>
            </p>
            <p className="copyinfo">Built by Aleph.js in Deno v{version.deno}</p>
        </div>
    )
}
