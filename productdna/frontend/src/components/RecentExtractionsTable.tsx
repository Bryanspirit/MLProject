import React from 'react';

const RecentExtractionsTable: React.FC = () => {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden">
      <div className="p-5 border-b border-outline-variant flex justify-between items-center">
        <h2 className="font-h3 text-h3 text-on-surface">Recent Extractions</h2>
        <button className="font-body-sm text-body-sm text-primary hover:text-surface-tint font-medium transition-colors">View All</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant uppercase border-b border-outline-variant">
            <tr>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold w-16">Item</th>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold">Brand</th>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold">Product Name</th>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold">Confidence</th>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold">Status</th>
              <th className="px-cell-padding-h py-cell-padding-v font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant">
            {/* Row 1 */}
            <tr className="hover:bg-surface-container-low transition-colors h-8">
              <td className="px-cell-padding-h py-1">
                <div className="w-8 h-8 rounded bg-surface-variant border border-outline-variant overflow-hidden">
                  <img alt="Sneaker" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjxKb0kkwxUQZwzfOa_RDuSOdevh9USTdABuBmtT8bCHUHTRQh76EylPEHW7YZfQKjZCrQltfBOAvkBZpqpdiS1bFzfFXytjBQAcYHPbHDdZs_0psso_aJLjcjERbT-2_quG3YqirGwWisN_qr-zB7U7RANVoHngwSbrDOaJmPwijizuQChFZXKffHZdJ_A5OUMcC-USdiKwJ54HaGo_2_U8PUDCRJmNWldKXmIBzrIzARmPqhY0lgqx1NSuTVu_HItHBNVlvw-2rj" />
                </div>
              </td>
              <td className="px-cell-padding-h py-1 text-on-surface-variant">Nike</td>
              <td className="px-cell-padding-h py-1 font-medium">Air Zoom Pegasus 39</td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">98%</span>
              </td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center gap-1 text-on-surface-variant"><span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>Approved</span>
              </td>
              <td className="px-cell-padding-h py-1 text-right text-on-surface-variant">10:42 AM</td>
            </tr>
            {/* Row 2 */}
            <tr className="hover:bg-surface-container-low transition-colors h-8">
              <td className="px-cell-padding-h py-1">
                <div className="w-8 h-8 rounded bg-surface-variant border border-outline-variant overflow-hidden">
                  <img alt="Headphones" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQJ3RFmatNoxpRGrdJInV2s0-2DLFneeCGNPe4qGL6Ya-jDHc21BE2E2VDM2aHz-YAzdT2LyFdQa14o31vOQNZGmrWSIC4hwYsgS2t3nHlStI-nYZWiPhhjsp0KlC720wpDPJ-8nau9-eKQrs8DMyQs7Vuh49p_7G4YD8xG8u_aOlQIAvgiVHC3cpNKSIf3nYV45ItoxHvfbcxG9xJ1blp27N8jJYp34prV3zXayI2nR6RGFk67LK0TDD5bu6k3cNrBn6Xr-PN5rQh" />
                </div>
              </td>
              <td className="px-cell-padding-h py-1 text-on-surface-variant">Sony</td>
              <td className="px-cell-padding-h py-1 font-medium">WH-1000XM5</td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF3E0] text-[#E65100]">74%</span>
              </td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center gap-1 text-tertiary-container"><span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>Needs Review</span>
              </td>
              <td className="px-cell-padding-h py-1 text-right text-on-surface-variant">10:38 AM</td>
            </tr>
            {/* Row 3 */}
            <tr className="hover:bg-surface-container-low transition-colors h-8">
              <td className="px-cell-padding-h py-1">
                <div className="w-8 h-8 rounded bg-surface-variant border border-outline-variant overflow-hidden">
                  <img alt="Watch" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuByo78i5xPuGn346fSoeqiOyvLT8slnTaGdPMsw68LKXMhppZNP2vuDrwtyDgQp9thC4k0UNWxLPKMVq2z_AH24XfRSHCc40mWzT8p-5RvIAz16wPIQI3PwEsi94tFKaMHT1weaIpaSoE74wNklqEvqYu6AkFYC2xO1WPz6AM9nEZNP73Ci8l0Pa8pdcjlycCqO1SMJZiewANzAoaOwzJHsu63LyNUYYGvdmIuTGEsxtmPOX2mITCoyRsZqBWKcZvj9X9xQGAMUjY7B" />
                </div>
              </td>
              <td className="px-cell-padding-h py-1 text-on-surface-variant">Apple</td>
              <td className="px-cell-padding-h py-1 font-medium">Watch Series 8</td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">95%</span>
              </td>
              <td className="px-cell-padding-h py-1">
                <span className="inline-flex items-center gap-1 text-on-surface-variant"><span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>Approved</span>
              </td>
              <td className="px-cell-padding-h py-1 text-right text-on-surface-variant">10:15 AM</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentExtractionsTable;