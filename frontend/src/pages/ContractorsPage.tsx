import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useMineContext } from '../context/MineContext';
import { governanceService } from '../services';
import { Contractor, Contract } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Building2, FileText } from 'lucide-react';

export const ContractorsPage: React.FC = () => {
  const { selectedMine } = useMineContext();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);

  const fetchData = async () => {
    if (!selectedMine) return;
    setIsLoading(true);
    try {
      const [contractorsData, contractsData] = await Promise.all([
        governanceService.getContractors(),
        governanceService.getContracts(selectedMine.id)
      ]);
      setContractors(contractorsData);
      setContracts(contractsData);
      if (contractorsData.length > 0) {
        setSelectedContractor(contractorsData[0]);
      }
    } catch (err) {
      console.error('Failed to load contractor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMine?.id]);

  if (!selectedMine) return null;

  const totalContractors = contractors.length;
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;
  const expiringContracts = contracts.filter((c) => c.status === 'EXPIRING_SOON').length;
  const compliantContractors = contracts.filter((c) => c.compliance_status === 'COMPLIANT').length;

  const selectedContractorContracts = contracts.filter(
    (c) => selectedContractor && c.contractor_id === selectedContractor.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 font-sans text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1B211E] pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              <Building2 className="w-5 h-5 text-amber-400 shrink-0" />
              Contractor Governance & Compliance Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-[#121614] text-amber-400 border border-[#27302B] font-semibold">
              AUDITED VENDORS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Monitor outsourced mining operations, equipment contracts, statutory certifications, and contract expiry SLAs.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Registered Agencies</span>
          <p className="font-mono text-2xl font-black text-white">{totalContractors}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Active Contracts</span>
          <p className="font-mono text-2xl font-black text-emerald-400">{activeContracts}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Expiring / Reviews</span>
          <p className="font-mono text-2xl font-black text-amber-400">{expiringContracts}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#0D100F] border border-[#1B211E] space-y-1 shadow-xs bg-gradient-to-br from-[#0D100F] to-[#121614]">
          <span className="font-sans text-[10.5px] uppercase font-semibold text-slate-400 tracking-wider block">Compliant Contracts</span>
          <p className="font-mono text-2xl font-black text-cyan-400">
            {contracts.length > 0 ? ((compliantContractors / contracts.length) * 100).toFixed(0) : 100}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-xs">
        {/* Contractor List */}
        <div className="lg:col-span-1 bg-[#0D100F] border border-[#1B211E] rounded-xl p-4 space-y-3 shadow-xs">
          <h3 className="font-bold text-white flex items-center justify-between text-sm">
            <span>Contracting Entities</span>
            <span className="font-mono text-[10.5px] text-slate-400">{contractors.length} active</span>
          </h3>

          <div className="space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400 font-mono text-xs animate-pulse">Loading vendors...</div>
            ) : (
              contractors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContractor(c)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                    selectedContractor?.id === c.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-xs'
                      : 'bg-[#080A09] border-[#1B211E] text-slate-300 hover:bg-[#121614]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-amber-400">{c.contractor_code}</span>
                    <span className="font-mono px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      Rating: {c.safety_rating}/5.0
                    </span>
                  </div>
                  <p className="font-bold text-xs text-white mt-1">{c.company_name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Contact: {c.contact_person} ({c.phone})</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Contractor Detail & Active Contracts */}
        <div className="lg:col-span-2 space-y-4">
          {selectedContractor ? (
            <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-5 space-y-5 shadow-xs">
              <div className="flex items-start justify-between border-b border-[#1B211E] pb-4">
                <div>
                  <span className="font-mono text-[10.5px] text-amber-400 uppercase tracking-wider font-semibold">{selectedContractor.contractor_code} • Vendor Dossier</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{selectedContractor.company_name}</h3>
                  <p className="text-slate-400 text-xs mt-1">{selectedContractor.email} • {selectedContractor.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] text-slate-400 uppercase font-semibold block">GST / Reg Number</span>
                  <p className="font-mono font-bold text-slate-300 mt-0.5">{selectedContractor.registration_number}</p>
                </div>
              </div>

              {/* Associated Contracts */}
              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Active & Scheduled Work Contracts
                </h4>

                {selectedContractorContracts.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No contracts assigned to this contractor for the current mine.</p>
                ) : (
                  selectedContractorContracts.map((contract) => (
                    <div key={contract.id} className="p-4 bg-[#080A09] border border-[#1B211E] rounded-lg space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">{contract.contract_code}</span>
                            <span className="text-white font-bold">{contract.work_scope}</span>
                          </div>
                          {contract.description && <p className="text-slate-400 text-xs mt-1">{contract.description}</p>}
                        </div>
                        <StatusBadge status={contract.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-[#1B211E] text-xs">
                        <div>
                          <span className="text-slate-400 text-[10.5px] block font-semibold">Effective Date</span>
                          <span className="font-mono text-slate-300">{contract.start_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10.5px] block font-semibold">Expiry Date</span>
                          <span className="font-mono text-slate-300 font-semibold">{contract.end_date}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10.5px] block font-semibold">Contract Value</span>
                          <span className="font-mono text-amber-400 font-bold">
                            ₹{contract.total_value?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10.5px] block font-semibold">Compliance State</span>
                          <span className={`font-mono font-bold ${
                            contract.compliance_status === 'COMPLIANT' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {contract.compliance_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#0D100F] border border-[#1B211E] rounded-xl p-8 text-center text-slate-400 font-sans text-xs">
              Select a contractor from the left panel to inspect contract terms and compliance status.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
