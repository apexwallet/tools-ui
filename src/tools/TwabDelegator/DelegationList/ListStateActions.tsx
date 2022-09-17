import { WithdrawSvg, StakeSvg } from '@components/SvgComponents'
import {
  BottomSheet,
  ModalTitle,
  SquareButton,
  SquareButtonSize,
  SquareButtonTheme,
  ThemedClipSpinner,
  Tooltip
} from '@pooltogether/react-components'
import { useUsersAddress } from '@pooltogether/wallet-connection'
import {
  delegationUpdatesCountAtom,
  delegationFundsAtom,
  delegationFundsCountAtom,
  delegationUpdatesAtom,
  delegationUpdatesModalOpenAtom,
  delegationWithdrawalsAtom,
  delegationWithdrawlsCountAtom,
  delegationCreationsCountAtom,
  delegationCreationsAtom
} from '@twabDelegator/atoms'
import { FixedFooterNav } from '@twabDelegator/FixedFooterNav'
import { useIsDelegatorsBalanceSufficient } from '@twabDelegator/hooks/useIsDelegatorsBalanceSufficient'
import { useIsDelegatorsStakeSufficient } from '@twabDelegator/hooks/useIsDelegatorsStakeSufficient'
import { useIsUserDelegatorsRepresentative } from '@twabDelegator/hooks/useIsUserDelegatorsRepresentative'
import { ChangeDelegatorModal } from '@twabDelegator/UsersDelegationState'
import FeatherIcon from 'feather-icons-react'
import { useAtom } from 'jotai'
import { useResetAtom, useUpdateAtom } from 'jotai/utils'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useState } from 'react'
import { ListState } from '.'
import { DelegationConfirmationList } from './DelegationConfirmationList'
import { StakeModal } from './StakeModal'

interface ListStateActionsProps {
  chainId: number
  listState: ListState
  delegator: string
  transactionsPending: boolean
  setListState: (listState: ListState) => void
  setDelegator: (delegator: string) => void
}

// TODO: Cancel confirmation modal
export const ListStateActions: React.FC<ListStateActionsProps> = (props) => {
  const { chainId, listState, transactionsPending, delegator, setDelegator, setListState } = props
  const [editsCount] = useAtom(delegationUpdatesCountAtom)
  const [creationsCount] = useAtom(delegationCreationsCountAtom)
  const [fundsCount] = useAtom(delegationFundsCountAtom)
  const [withdrawlsCount] = useAtom(delegationWithdrawlsCountAtom)
  const setIsConfirmationModalOpen = useUpdateAtom(delegationUpdatesModalOpenAtom)
  const resetDelegationUpdates = useResetAtom(delegationUpdatesAtom)
  const resetDelegationCreations = useResetAtom(delegationCreationsAtom)
  const resetDelegationFunds = useResetAtom(delegationFundsAtom)
  const resetDelegationWithdrawals = useResetAtom(delegationWithdrawalsAtom)
  const usersAddress = useUsersAddress()
  const [delegationFunds] = useAtom(delegationFundsAtom)
  const isBalanceSufficient = useIsDelegatorsBalanceSufficient(chainId, delegator, delegationFunds)
  const isStakeSufficient = useIsDelegatorsStakeSufficient(chainId, delegator, delegationFunds)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isStakeModalOpen, setIsStakeModalOpen] = useState<boolean>(false)
  const { t } = useTranslation()
  const { data: isUserARepresentative, isFetched: isRepresentativeFetched } =
    useIsUserDelegatorsRepresentative(chainId, usersAddress, delegator)

  if (!isRepresentativeFetched) return null

  // TODO: Return a wrapper with content so we can pass classNames and style the container easier
  if (delegator && usersAddress !== delegator && !isUserARepresentative) {
    return (
      <FixedFooterNav>
        <div className='w-full flex justify-end'>
          <SquareButton
            className='px-8'
            size={SquareButtonSize.sm}
            disabled={transactionsPending}
            onClick={() => {
              setIsOpen(true)
            }}
            theme={SquareButtonTheme.tealOutline}
          >
            {t('changeDelegator')}
          </SquareButton>
          <ChangeDelegatorModal
            isOpen={isOpen}
            delegator={delegator}
            setDelegator={setDelegator}
            setIsOpen={setIsOpen}
          />
        </div>
      </FixedFooterNav>
    )
  } else if (listState === ListState.edit) {
    return (
      <FixedFooterNav>
        <>
          <ConfirmCancellationButton
            chainId={chainId}
            delegator={delegator}
            disabled={transactionsPending}
            cancelUpdates={() => {
              resetDelegationUpdates()
              resetDelegationCreations()
              resetDelegationFunds()
              setListState(ListState.readOnly)
            }}
            updatesCount={creationsCount + fundsCount + editsCount}
          />
          <div className='flex space-x-2 items-center'>
            <div className='flex flex-col space-y-1 justify-between items-end'>
              <EditedIconAndCount
                count={creationsCount}
                icon='plus-circle'
                tooltipText={t('createSlot')}
              />
              <EditedIconAndCount
                count={fundsCount}
                icon='dollar-sign'
                tooltipText={t('fundDelegatee')}
              />
              <EditedIconAndCount
                count={editsCount}
                icon='edit-2'
                tooltipText={t('editDelegatee')}
              />
            </div>
            {!isUserARepresentative && isBalanceSufficient !== null && !isBalanceSufficient && (
              <Tooltip
                id={`tooltip-edited-icon-${Math.random()}`}
                tip={t('insufficientBalanceForDelegations')}
              >
                <FeatherIcon icon='alert-triangle' className='w-4 h-4 text-pt-red-light' />
              </Tooltip>
            )}
            {isUserARepresentative && isStakeSufficient !== null && !isStakeSufficient && (
              <Tooltip
                id={`tooltip-edited-icon-${Math.random()}`}
                tip={t('insufficientStakeForDelegations')}
              >
                <FeatherIcon icon='alert-triangle' className='w-4 h-4 text-pt-red-light' />
              </Tooltip>
            )}
            <SquareButton
              className='flex space-x-2'
              size={SquareButtonSize.sm}
              onClick={() => setIsConfirmationModalOpen(true)}
              disabled={!fundsCount && !editsCount && !creationsCount}
            >
              <span className='capitalize'>
                {transactionsPending ? t('savingChanges') : t('saveChanges')}
              </span>
              {transactionsPending && <ThemedClipSpinner sizeClassName='w-4 h-4' />}
            </SquareButton>
          </div>
        </>
      </FixedFooterNav>
    )
  } else if (listState === ListState.withdraw) {
    return (
      <FixedFooterNav>
        <div className='w-full flex justify-between space-x-2'>
          <ConfirmCancellationButton
            chainId={chainId}
            delegator={delegator}
            disabled={transactionsPending}
            cancelUpdates={() => {
              resetDelegationWithdrawals()
              setListState(ListState.readOnly)
            }}
            updatesCount={withdrawlsCount}
          />
          <SquareButton
            className='flex space-x-2 w-40'
            size={SquareButtonSize.sm}
            onClick={() => setIsConfirmationModalOpen(true)}
            disabled={!withdrawlsCount}
          >
            <span>
              {transactionsPending
                ? t('withdrawing')
                : withdrawlsCount
                ? `${t('withdraw')} (${withdrawlsCount})`
                : t('withdraw')}
            </span>
            {transactionsPending && <ThemedClipSpinner sizeClassName='w-3 h-3' />}
          </SquareButton>
        </div>
      </FixedFooterNav>
    )
  }

  return (
    <>
      <FixedFooterNav>
        <div className='w-full flex justify-center space-x-2'>
          {delegator === usersAddress && (
            <SquareButton
              className='w-32'
              size={SquareButtonSize.sm}
              onClick={() => setIsStakeModalOpen(true)}
              disabled={transactionsPending}
            >
              <div className='text-primary w-4 h-4 mr-1'>
                <StakeSvg />
              </div>
              {t('stake')}
            </SquareButton>
          )}
          <SquareButton
            className='w-32'
            size={SquareButtonSize.sm}
            onClick={() => setListState(ListState.withdraw)}
            disabled={transactionsPending}
          >
            <div className='text-primary w-4 h-4 mr-1'>
              <WithdrawSvg />
            </div>
            {t('withdraw')}
          </SquareButton>
          <SquareButton
            className='w-24'
            size={SquareButtonSize.sm}
            onClick={() => setListState(ListState.edit)}
            disabled={transactionsPending}
          >
            <FeatherIcon strokeWidth='3' icon='edit' className='w-4 h-4 mr-1' /> {t('edit')}
          </SquareButton>
        </div>
      </FixedFooterNav>
      <StakeModal
        chainId={chainId}
        delegator={delegator}
        isOpen={isStakeModalOpen}
        closeModal={() => setIsStakeModalOpen(false)}
      />
    </>
  )
}

export const EditedIconAndCount: React.FC<{ count: number; icon: string; tooltipText: string }> = ({
  count,
  icon,
  tooltipText
}) => {
  if (count < 1) return null
  return (
    <div className='flex space-x-1'>
      <Tooltip id={`tooltip-edited-icon-${Math.random()}`} tip={tooltipText}>
        <div className='col-span-2 flex space-x-1 items-center'>
          <span className='text-xxxs'>{count}</span>
          <FeatherIcon icon={icon} className='w-4 h-4 text-yellow' />
        </div>
      </Tooltip>
    </div>
  )
}

interface ConfirmCancellationProps {
  chainId: number
  delegator: string
  updatesCount: number
  disabled: boolean
  cancelUpdates: () => void
}

const ConfirmCancellationButton: React.FC<ConfirmCancellationProps> = (props) => {
  const { disabled, updatesCount, cancelUpdates } = props

  const [isOpen, setIsOpen] = useState<boolean>(false)
  const { t } = useTranslation()

  return (
    <>
      <div>
        <SquareButton
          className='w-24'
          size={SquareButtonSize.sm}
          onClick={() => {
            if (!updatesCount) {
              cancelUpdates()
            } else {
              setIsOpen(true)
            }
          }}
          theme={SquareButtonTheme.tealOutline}
          disabled={disabled}
        >
          {t('cancel')}
        </SquareButton>
      </div>
      <ConfirmCancellationModal {...props} isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  )
}

const ConfirmCancellationModal: React.FC<{
  chainId: number
  delegator: string
  disabled: boolean
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  cancelUpdates: () => void
}> = (props) => {
  const { chainId, delegator, isOpen, disabled, setIsOpen, cancelUpdates } = props
  const { t } = useTranslation()

  return (
    <BottomSheet
      label='cancel-delegation-edits-modal'
      open={isOpen}
      onDismiss={() => {
        setIsOpen(false)
      }}
      className='flex flex-col space-y-4'
    >
      <ModalTitle chainId={chainId} title={t('confirmCancellation')} />
      <div>
        <p className='text-xs font-bold mb-1'>{t('Lost changes')}</p>
        <DelegationConfirmationList chainId={chainId} delegator={delegator} />
      </div>
      <SquareButton
        className='w-full'
        onClick={cancelUpdates}
        theme={SquareButtonTheme.orangeOutline}
        disabled={disabled}
      >
        {t('cancelChanges')}
      </SquareButton>
    </BottomSheet>
  )
}
