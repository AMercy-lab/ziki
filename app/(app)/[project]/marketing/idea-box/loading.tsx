import { IdeaBoxHeading } from "@/components/marketing/idea-box/heading";
import "@/components/marketing/idea-box/idea-box.css";

export default function LoadingIdeaBox() {
  return <div className="ib-page"><div className="ib-breadcrumb" aria-hidden="true"><div className="ib-skeleton" style={{ width: 210 }} /></div><IdeaBoxHeading />
    <div className="ib-toolbar" aria-hidden="true"><div className="ib-skeleton ib-loading-search" /><div className="ib-filters">{Array.from({ length: 7 }, (_, index) => <div className="ib-skeleton ib-loading-filter" key={index} />)}</div><div className="ib-skeleton ib-loading-sort" /></div>
    <p className="ib-count" role="status">Loading approved work…</p>
    <div className="ib-split" aria-busy="true" aria-label="Approved deliverables">
      <div className="ib-collection" aria-hidden="true"><ul>{Array.from({ length: 6 }, (_, index) => <li className="ib-skeleton-row" key={index}><div className="ib-skeleton ib-skeleton-thumb" /><div className="ib-skeleton-text"><div className="ib-skeleton" /><div className="ib-skeleton" /><div className="ib-skeleton" /></div></li>)}</ul></div>
      <div className="ib-detail ib-skeleton-detail" aria-hidden="true"><div className="ib-skeleton" /><div className="ib-skeleton" /><div className="ib-skeleton" /><div className="ib-skeleton" /></div>
    </div>
  </div>;
}
