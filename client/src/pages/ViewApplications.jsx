import { useCallback, useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContextValue'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {

  const { backendUrl, companyToken, companyData } = useContext(AppContext)

  const [applicants, setApplicants] = useState(false)
  const [openingResumeId, setOpeningResumeId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const openResume = async (applicationId, directResumeUrl) => {
    try {
      setOpeningResumeId(applicationId)
      const { data } = await axios.get(
        `${backendUrl}/api/company/resume/${applicationId}`,
        { headers: { token: companyToken }, responseType: 'blob' }
      )
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank')
      if (w) w.opener = null
      else toast.error('Allow pop-ups to view the resume')
      setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (error) {
      let msg = 'Failed to open resume'
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const parsed = JSON.parse(text)
          if (parsed.message) msg = parsed.message
        } catch {
          /* ignore */
        }
      } else if (error.response?.data?.message) {
        msg = error.response.data.message
      }
      toast.warning(`${msg} Trying direct link…`)
      if (directResumeUrl && /^https?:\/\//i.test(directResumeUrl)) {
        const w = window.open(directResumeUrl.trim(), '_blank')
        if (w) w.opener = null
      } else {
        toast.error('No resume URL available')
      }
    } finally {
      setOpeningResumeId(null)
    }
  }

  // Function to fetch company Job Applications data 
  const fetchCompanyJobApplications = useCallback(async () => {

    try {

      const { data } = await axios.get(backendUrl + '/api/company/applicants',
        { headers: { token: companyToken } }
      )

      if (data.success) {
        setApplicants(data.applications.reverse())
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }, [backendUrl, companyToken])

  useEffect(() => {
    if (actionMenuId === null) return
    const handleOutside = (e) => {
      if (!e.target.closest('[data-app-actions]')) {
        setActionMenuId(null)
      }
    }
    document.addEventListener('click', handleOutside)
    return () => document.removeEventListener('click', handleOutside)
  }, [actionMenuId])

  // Function to Update Job Applications Status 
  const changeJobApplicationStatus = async (id, status) => {
    try {
      setUpdatingId(id)
      setActionMenuId(null)

      const { data } = await axios.post(backendUrl + '/api/company/change-status',
        { id, status },
        { headers: { token: companyToken } }
      )

      if (data.success) {
        await fetchCompanyJobApplications()
        toast.success(data.message || 'Status updated.')
        const en = data.emailNotification
        if (en?.queued) {
          toast.info(en.message || 'The applicant will receive an email shortly.')
        } else if (en && en.success === false && en.message) {
          toast.warning(en.message)
        }
        if (companyData?.emailConfigured === false && !en) {
          toast.info(
            'Set RESEND_API_KEY (or SendGrid / Gmail SMTP) on the server to email applicants automatically.'
          )
        }
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Request failed'
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    if (companyToken) {
      fetchCompanyJobApplications()
    }
  }, [companyToken, fetchCompanyJobApplications])

  return applicants ? applicants.length === 0 ? (
    <div className='flex items-center justify-center h-[70vh]'>
      <p className='text-xl sm:text-2xl'>No Applications Available</p>
    </div>
  ) : (
    <div className='container mx-auto p-4'>
      <div>
        <table className='w-full max-w-4xl bg-white border border-gray-200 max-sm:text-sm'>
          <thead>
            <tr className='border-b'>
              <th className='py-2 px-4 text-left'>#</th>
              <th className='py-2 px-4 text-left'>User name</th>
              <th className='py-2 px-4 text-left max-sm:hidden'>Job Title</th>
              <th className='py-2 px-4 text-left max-sm:hidden'>Location</th>
              <th className='py-2 px-4 text-left'>Resume</th>
              <th className='py-2 px-4 text-left'>Action</th>
            </tr>
          </thead>
          <tbody>
            {applicants.filter(item => item.jobId && item.userId).map((applicant, index) => (
              <tr key={index} className='text-gray-700'>
                <td className='py-2 px-4 border-b text-center'>{index + 1}</td>
                <td className='py-2 px-4 border-b text-center flex items-center'>
                  <img
                    className='w-10 h-10 rounded-full mr-3 max-sm:hidden object-cover bg-slate-100 shrink-0'
                    src={applicant.userId.image?.trim() ? applicant.userId.image : assets.profile_img}
                    alt=""
                  />
                  <span>{applicant.userId.name}</span>
                </td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                <td className='py-2 px-4 border-b max-sm:hidden'>{applicant.jobId.location}</td>
                <td className='py-2 px-4 border-b'>
                  <button
                    type='button'
                    disabled={!applicant.userId.resume || openingResumeId === applicant._id}
                    onClick={() => openResume(applicant._id, applicant.userId.resume)}
                    className='bg-blue-50 text-blue-400 px-3 py-1 rounded inline-flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    {openingResumeId === applicant._id ? 'Opening…' : 'Resume'}{' '}
                    <img src={assets.resume_download_icon} alt="" />
                  </button>
                </td>
                <td className='py-2 px-4 border-b relative' data-app-actions>
                  {applicant.status === "Pending"
                    ? <div className='relative inline-block text-left'>
                      <button
                        type='button'
                        disabled={updatingId === applicant._id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuId((prev) => (prev === applicant._id ? null : applicant._id))
                        }}
                        className='text-gray-500 action-button px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50'
                      >
                        {updatingId === applicant._id ? '…' : '⋯'}
                      </button>
                      {actionMenuId === applicant._id && (
                        <div className='z-30 absolute right-0 md:left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1'>
                          <button
                            type='button'
                            disabled={updatingId === applicant._id}
                            onClick={(e) => {
                              e.stopPropagation()
                              changeJobApplicationStatus(applicant._id, 'Accepted')
                            }}
                            className='block w-full text-left px-4 py-2 text-blue-600 hover:bg-gray-100 disabled:opacity-50'
                          >
                            Accept
                          </button>
                          <button
                            type='button'
                            disabled={updatingId === applicant._id}
                            onClick={(e) => {
                              e.stopPropagation()
                              changeJobApplicationStatus(applicant._id, 'Rejected')
                            }}
                            className='block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 disabled:opacity-50'
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    : <div>{applicant.status}</div>
                  }

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : <Loading />
}

export default ViewApplications