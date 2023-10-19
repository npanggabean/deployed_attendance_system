import React from "react";

import "bootstrap/dist/css/bootstrap.css";
import TitleLogo from './TitleLogo';

export default function Navbar() {


  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img
            src="https://static.wixstatic.com/media/6d953a_46999fe10c9f41eeb37ad293777329ec~mv2.png/v1/fill/w_293,h_150,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/small_Logo_LbP2_edited.png"
            alt="Your Logo"
            width="293"
            height="150"
          />
          
        </div>
      </nav>
    </div>
  );
}
