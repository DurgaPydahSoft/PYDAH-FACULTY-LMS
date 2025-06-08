import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-gray-800 p-10 rounded-neumorphic border-t-8 mt-2 border-primary ">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Campus Life Section */}
          <div className="p-6 rounded-neumorphic ">
            <h3 className="text-lg font-semibold text-primary mb-4">Campus Life</h3>
            <ul className="space-y-2 text-accent">
              <li className="hover:text-primary cursor-pointer">NCC & NSS Cell</li>
              <li className="hover:text-primary cursor-pointer">Clubs & Activities</li>
              <li className="hover:text-primary cursor-pointer">Professional Bodies</li>
              <li className="hover:text-primary cursor-pointer">College Events</li>
              <li className="hover:text-primary cursor-pointer">Campus News Letter</li>
            </ul>
          </div>

          {/* Admissions Section */}
          <div className="p-6 rounded-neumorphic ">
            <h3 className="text-lg font-semibold text-primary mb-4">Admissions</h3>
            <p className="text-accent">📞 +91 73824 56539 | +91 73820 15999</p>
            <p className="text-accent">✉️ admissions@pydah.edu.in</p>
          </div>

          {/* Placements Section */}
          <div className="p-6 rounded-neumorphic ">
            <h3 className="text-lg font-semibold text-primary mb-4">Placements</h3>
            <p className="text-accent">📞 +91 98496 17788</p>
            <p className="text-accent">✉️ tpo@pydah.edu.in</p>
          </div>

          {/* Quick Links Section */}
          <div className="p-6 rounded-neumorphic ">
            <h3 className="text-lg font-semibold text-primary mb-4">Quick Links</h3>
            <ul className="space-y-2 text-accent">
              <li className="hover:text-primary cursor-pointer">Key Contacts</li>
              <li className="hover:text-primary cursor-pointer">Alumni</li>
              <li className="hover:text-primary cursor-pointer">e-Office</li>
              <li className="hover:text-primary cursor-pointer">Careers</li>
              <li className="hover:text-primary cursor-pointer">NAAC</li>
              <li className="hover:text-primary cursor-pointer">AQAR</li>
              <li className="hover:text-primary cursor-pointer">Webmaster Login</li>
            </ul>
          </div>
        </div>

        {/* Contact Information and Address */}
        <div className="p-8 rounded w-full bg-secondary border-t border-gray-300 pt-8 text-center" >
          <h3 className="text-xl font-semibold text-textDark">Pydah College of Engineering</h3>
          <p className="text-accent">An Autonomous Institution with NAAC Grade A</p>
          <p className="text-accent">Established in 2009 to impart the highest quality education.</p>
          <p className="text-accent">Kakinada - Yanam Road, Patavala, Andhra Pradesh, India</p>
          <p className="text-accent">Pincode: 533461</p>
          <p className="text-accent">EAPCET/POLYCET/ECET/PGECET CODE: PYDE</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
