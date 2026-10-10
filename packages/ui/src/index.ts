// Публичный API кита. Компоненты объявлены, но не зарегистрированы: приложение
// вызывает registerAll() (или register* для отдельных) и при желании задаёт постфикс —
// так две версии кита уживаются на одной странице.
import { registerAccordion } from "./components/accordion";
import { registerAlert } from "./components/alert";
import { registerAvatar } from "./components/avatar";
import { registerBadge } from "./components/badge";
import { registerButton } from "./components/button";
import { registerCard } from "./components/card";
import { registerCheckbox } from "./components/checkbox";
import { registerDialog } from "./components/dialog";
import { registerDivider } from "./components/divider";
import { registerDropdownMenu } from "./components/dropdown-menu";
import { registerInput } from "./components/input";
import { registerPopover } from "./components/popover";
import { registerProgress } from "./components/progress";
import { registerRadioGroup } from "./components/radio-group";
import { registerSelect } from "./components/select";
import { registerSkeleton } from "./components/skeleton";
import { registerSpinner } from "./components/spinner";
import { registerSwitch } from "./components/switch";
import { registerTabs } from "./components/tabs";
import { registerTextarea } from "./components/textarea";
import { registerToast } from "./components/toast";
import { registerTooltip } from "./components/tooltip";

export type RegisterOptions = {
  /** Суффикс тегов: postfix "v2" даёт rwc-button-v2. Вызовы фабрик при этом не меняются. */
  postfix?: string;
};

/** Регистрирует все компоненты кита. */
export const registerAll = (options?: RegisterOptions) => {
  for (const register of [
    registerButton,
    registerInput,
    registerTextarea,
    registerCheckbox,
    registerSwitch,
    registerSelect,
    registerRadioGroup,
    registerDialog,
    registerTooltip,
    registerPopover,
    registerDropdownMenu,
    registerTabs,
    registerAccordion,
    registerCard,
    registerBadge,
    registerAvatar,
    registerDivider,
    registerToast,
    registerAlert,
    registerSpinner,
    registerProgress,
    registerSkeleton,
  ]) {
    register(options);
  }
};

export { controlStyles, tokens } from "./tokens";

// Формы
export { Button, registerButton, rwcButton, type ButtonSize, type ButtonVariant } from "./components/button";
export { Input, registerInput, rwcInput, type InputType } from "./components/input";
export { Textarea, registerTextarea, rwcTextarea } from "./components/textarea";
export { Checkbox, registerCheckbox, rwcCheckbox } from "./components/checkbox";
export { Switch, registerSwitch, rwcSwitch } from "./components/switch";
export { Select, registerSelect, rwcSelect, type SelectOption } from "./components/select";
export {
  RadioGroup,
  registerRadioGroup,
  rwcRadioGroup,
  type RadioGroupOrientation,
  type RadioOption,
} from "./components/radio-group";

// Оверлеи
export { Dialog, registerDialog, rwcDialog, type DialogCloseReason } from "./components/dialog";
export { Tooltip, registerTooltip, rwcTooltip, type TooltipPlacement } from "./components/tooltip";
export {
  Popover,
  registerPopover,
  rwcPopover,
  type PopoverAlign,
  type PopoverCloseReason,
  type PopoverPlacement,
} from "./components/popover";
export { DropdownMenu, registerDropdownMenu, rwcDropdownMenu, type MenuItem } from "./components/dropdown-menu";

// Структура
export {
  Tab,
  TabPanel,
  Tabs,
  registerTabs,
  rwcTab,
  rwcTabPanel,
  rwcTabs,
  type TabsActivation,
  type TabsOrientation,
} from "./components/tabs";
export {
  Accordion,
  AccordionItem,
  registerAccordion,
  rwcAccordion,
  rwcAccordionItem,
  type AccordionToggleDetail,
} from "./components/accordion";
export { Card, registerCard, rwcCard, type CardVariant } from "./components/card";
export { Badge, registerBadge, rwcBadge, type BadgeSize, type BadgeVariant } from "./components/badge";
export { Avatar, registerAvatar, rwcAvatar, type AvatarShape, type AvatarSize } from "./components/avatar";
export { Divider, registerDivider, rwcDivider, type DividerOrientation } from "./components/divider";

// Обратная связь
export {
  Toast,
  Toaster,
  dismissToast,
  registerToast,
  rwcToast,
  rwcToaster,
  toast,
  type ToastAction,
  type ToastOptions,
  type ToastRecord,
  type ToastVariant,
  type ToasterPlacement,
} from "./components/toast";
export { Alert, registerAlert, rwcAlert, type AlertVariant } from "./components/alert";
export { Spinner, registerSpinner, rwcSpinner, type SpinnerSize } from "./components/spinner";
export { Progress, registerProgress, rwcProgress, type ProgressVariant } from "./components/progress";
export { Skeleton, registerSkeleton, rwcSkeleton, type SkeletonShape } from "./components/skeleton";
